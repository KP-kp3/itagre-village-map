"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { Resident, Spot } from "@/types/village";
import {
  createMarkerElement,
  residentIconConfig,
  spotIconConfig,
} from "./markerIcons";
import { loadBrandedStyle } from "@/lib/mapBrandStyle";
import { geocode } from "@/lib/geocode";

// 九州〜北海道の日本列島がちょうど画面に収まる範囲（[lng, lat]の順）
// fitBoundsで指定するため、画面比率（PC/スマホ）が変わっても常に「日本全体」を維持できる
// ピン設置フロー(PinPlacementFlow)の全画面マップでも同じ範囲を使うためexportする
export const JAPAN_BOUNDS: [[number, number], [number, number]] = [
  [128.5, 31],
  [146, 45.5],
];

// ピン選択時、下部のPopupCardに隠れないよう選択地点を画面やや上寄りに寄せる
const SELECT_PAN_OFFSET: [number, number] = [0, -120];

type Props = {
  residents: Resident[];
  spots: Spot[];
  selectedId: string | null;
  onSelectResident: (resident: Resident) => void;
  onSelectSpot: (spot: Spot) => void;
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  inner: HTMLElement;
  outer: HTMLElement;
  lngLat: [number, number];
};

export default function VillageMap({
  residents,
  spots,
  selectedId,
  onSelectResident,
  onSelectSpot,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersById = useRef<Map<string, MarkerEntry>>(new Map());
  // クリック時のハンドラが常に最新のresident/spotを参照できるよう、
  // マーカー作成時ではなくクリック時にここから引く(データ更新のたびにリスナーを付け替える必要がなくなる)
  const dataById = useRef<
    Map<
      string,
      { type: "resident"; data: Resident } | { type: "spot"; data: Spot }
    >
  >(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let map: maplibregl.Map | null = null;

    loadBrandedStyle().then((style) => {
      if (cancelled || !containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        bounds: JAPAN_BOUNDS,
        fitBoundsOptions: { padding: 16 },
        minZoom: 4,
        maxZoom: 17,
        attributionControl: { compact: true },
      });
      mapRef.current = map;

      map.on("error", (e) => console.error("maplibre error:", e.error));
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      setMapReady(true);
    });

    const entries = markersById.current;
    const dataMap = dataById.current;
    return () => {
      cancelled = true;
      entries.forEach((entry) => entry.marker.remove());
      entries.clear();
      dataMap.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // residents/spotsの変化に追従してマーカーを増減・更新する
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    const entries = markersById.current;
    const nextIds = new Set<string>();

    dataById.current.clear();
    for (const resident of residents) {
      dataById.current.set(resident.id, { type: "resident", data: resident });
    }
    for (const spot of spots) {
      dataById.current.set(spot.id, { type: "spot", data: spot });
    }

    for (const resident of residents) {
      nextIds.add(resident.id);
      const [lat, lng] = resident.position;
      upsertMarker(resident.id, [lng, lat], residentIconConfig, () => {
        const current = dataById.current.get(resident.id);
        if (current?.type === "resident") onSelectResident(current.data);
      });
    }

    for (const spot of spots) {
      nextIds.add(spot.id);
      const [lat, lng] = spot.position;
      upsertMarker(spot.id, [lng, lat], spotIconConfig, () => {
        const current = dataById.current.get(spot.id);
        if (current?.type === "spot") onSelectSpot(current.data);
      });
    }

    for (const [id, entry] of entries) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        entries.delete(id);
      }
    }

    function upsertMarker(
      id: string,
      lngLat: [number, number],
      config: typeof residentIconConfig | typeof spotIconConfig,
      onClick: () => void,
    ) {
      const existing = entries.get(id);
      if (existing) {
        if (
          existing.lngLat[0] !== lngLat[0] ||
          existing.lngLat[1] !== lngLat[1]
        ) {
          existing.marker.setLngLat(lngLat);
          existing.lngLat = lngLat;
        }
        return;
      }
      const { outer, inner } = createMarkerElement(config);
      outer.addEventListener("click", onClick);
      const marker = new maplibregl.Marker({ element: outer, anchor: "bottom" })
        .setLngLat(lngLat)
        .addTo(map!);
      entries.set(id, { marker, inner, outer, lngLat });
    }
    // onSelectResident/onSelectSpotは呼び出し側で毎回新しい関数になり得るため依存に含めない
    // (dataById経由でクリック時に最新のresident/spotを都度参照するため問題ない)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residents, spots, mapReady]);

  useEffect(() => {
    const entries = markersById.current;
    for (const [id, entry] of entries) {
      const isSelected = id === selectedId;
      entry.inner.classList.toggle("marker-selected", isSelected);
      // DOM要素へのimperativeなスタイル操作であり、refそのものの差し替えではないため問題ない
      // eslint-disable-next-line react-hooks/immutability
      entry.outer.style.zIndex = isSelected ? "500" : "";
    }

    const map = mapRef.current;
    const selected = selectedId ? entries.get(selectedId) : undefined;
    if (map && selected) {
      map.easeTo({
        center: selected.lngLat,
        offset: SELECT_PAN_OFFSET,
        duration: 700,
        easing: (t) => 1 - (1 - t) * (1 - t) * (1 - t),
      });
    }
  }, [selectedId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const map = mapRef.current;
    if (!map || !searchQuery.trim() || searching) return;

    setSearching(true);
    setSearchError(null);
    try {
      const result = await geocode(searchQuery.trim());
      if (!result) {
        setSearchError("見つかりませんでした");
        return;
      }
      map.flyTo({ center: [result.lng, result.lat], zoom: 14, duration: 1000 });
    } catch {
      setSearchError("検索中にエラーが発生しました");
    } finally {
      setSearching(false);
    }
  };

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map || locating) return;

    if (!navigator.geolocation) {
      setSearchError("この端末では現在地を取得できません");
      return;
    }

    setLocating(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 14,
          duration: 1000,
        });
        setLocating(false);
      },
      () => {
        setSearchError("現在地を取得できませんでした");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <>
      <div ref={containerRef} className="h-dvh w-dvw" />

      <form
        onSubmit={handleSearch}
        className="fixed left-4 top-20 z-[1050] flex flex-col items-start gap-1.5"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-cream/95 px-4 py-2.5 shadow-[0_8px_24px_-8px_rgba(58,51,44,0.35)] backdrop-blur-md">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="shrink-0 text-ink-soft"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchError(null);
              }}
              placeholder="場所を検索（例：渋谷駅）"
              className="w-40 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft sm:w-56"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim() || searching}
              aria-label="検索"
              className="shrink-0 text-xs font-semibold text-teal-dark disabled:opacity-40"
            >
              {searching ? "…" : "検索"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            aria-label="現在地に移動"
            title="現在地に移動"
            className="flex shrink-0 items-center justify-center rounded-full bg-cream/95 p-2.5 text-ink-soft shadow-[0_8px_24px_-8px_rgba(58,51,44,0.35)] backdrop-blur-md transition hover:text-teal-dark disabled:opacity-40"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        </div>
        {searchError && (
          <span className="rounded-full bg-cream/95 px-3 py-1 text-xs text-clay-dark shadow-sm">
            {searchError}
          </span>
        )}
      </form>
    </>
  );
}
