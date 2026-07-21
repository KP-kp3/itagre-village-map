"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { loadBrandedStyle } from "@/lib/mapBrandStyle";
import { spotToVillageSpot } from "@/lib/spotToVillageSpot";
import { PREFECTURES } from "@/data/prefectures";
import { createMarkerElement, spotIconConfig } from "./markerIcons";
import { JAPAN_BOUNDS } from "./VillageMap";
import LocationSearchBox from "./LocationSearchBox";
import type { Spot } from "@/types/village";
import type { Spot as SpotRow } from "@/types/database";

type Step = "picking" | "confirm" | "done";

type Props = {
  open: boolean;
  editingSpot: Spot | null;
  onClose: () => void;
  onSaved: (spot: Spot) => void;
  onDeleted: (spotId: string) => void;
};

export default function SpotFormFlow({
  open,
  editingSpot,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const { user, profile } = useAuth();
  const isEdit = !!editingSpot;

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [step, setStep] = useState<Step>("picking");
  const [tempPosition, setTempPosition] = useState<[number, number] | null>(
    null,
  );
  const [name, setName] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [description, setDescription] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    // モーダルを開くたびに新規登録/編集対象の状態で初期化する意図的なsetState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep("picking");
    setTempPosition(editingSpot ? editingSpot.position : null);
    setName(editingSpot?.name ?? "");
    setPrefecture(editingSpot?.prefecture ?? "");
    setDescription(editingSpot?.description ?? "");
    setConfirmingDelete(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingSpot?.id]);

  useEffect(() => {
    if (!open || !containerRef.current) return;

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
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      map.on("click", (e) => {
        setTempPosition([e.lngLat.lat, e.lngLat.lng]);
      });

      if (editingSpot) {
        map.setCenter([editingSpot.position[1], editingSpot.position[0]]);
        map.setZoom(13);
      }

      setMapReady(true);
    });

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !tempPosition) return;
    const [lat, lng] = tempPosition;

    if (!markerRef.current) {
      const { outer } = createMarkerElement(spotIconConfig);
      markerRef.current = new maplibregl.Marker({
        element: outer,
        anchor: "bottom",
      })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }
  }, [tempPosition, mapReady]);

  if (!open) return null;

  const canProceed = !!tempPosition && name.trim() && prefecture;

  const handleSave = async () => {
    if (!user || !tempPosition || !name.trim() || !prefecture || submitting)
      return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const payload = {
        name: name.trim(),
        prefecture,
        description: description.trim() ? description.trim() : null,
        lat: tempPosition[0],
        lng: tempPosition[1],
      };

      const { data, error: saveError } = editingSpot
        ? await supabase
            .from("spots")
            .update(payload)
            .eq("id", editingSpot.id)
            .select()
            .single()
        : await supabase
            .from("spots")
            .insert({ user_id: user.id, ...payload })
            .select()
            .single();
      if (saveError) throw saveError;
      setStep("done");
      onSaved(
        spotToVillageSpot({
          ...(data as SpotRow),
          profiles: profile
            ? { discord_username: profile.discord_username }
            : null,
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "エラーが発生しました。もう一度お試しください。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingSpot || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("spots")
        .delete()
        .eq("id", editingSpot.id);
      if (deleteError) throw deleteError;
      onDeleted(editingSpot.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "エラーが発生しました。もう一度お試しください。",
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1400] bg-cream">
      <div ref={containerRef} className="h-full w-full" />

      {step === "picking" && (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[1410] flex justify-center px-4 pt-4">
            <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-cream/95 px-4 py-2.5 shadow-[0_8px_24px_-8px_rgba(58,51,44,0.35)] backdrop-blur-md">
              <span className="text-sm font-medium text-ink">
                {tempPosition
                  ? "地図をクリックすると場所を変更できます"
                  : "地図をクリックしておすすめのスポットを選んでください"}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="閉じる"
                className="shrink-0 rounded-full p-1 text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>

          <LocationSearchBox
            onFound={(lat, lng) => {
              setTempPosition([lat, lng]);
              mapRef.current?.flyTo({
                center: [lng, lat],
                zoom: 15,
                duration: 1000,
              });
            }}
          />

          {tempPosition && (
            <div
              className="fixed inset-x-0 bottom-0 z-[1410] flex justify-center px-4 pb-4 sm:pb-6"
              style={{
                paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
              }}
            >
              <div
                className="w-full max-w-md overflow-hidden rounded-[28px] border border-ink/[0.06] bg-cream p-5"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(58,51,44,0.06), 0 12px 20px -8px rgba(58,51,44,0.18), 0 32px 64px -20px rgba(58,51,44,0.45)",
                }}
              >
                {confirmingDelete ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-ink">
                      本当にこのスポットを削除しますか？
                    </p>
                    <p className="text-xs text-ink-soft">
                      削除すると元に戻せません。
                    </p>
                    {error && <p className="text-xs text-clay-dark">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="flex-1 rounded-full border border-ink/10 px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-ink/5"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={submitting}
                        className="flex-1 rounded-full bg-clay-dark px-4 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? "削除中…" : "削除する"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">
                        スポット名
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例：隅田川テラス、大通公園"
                        className="rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-sage"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">
                        都道府県
                      </span>
                      <select
                        value={prefecture}
                        onChange={(e) => setPrefecture(e.target.value)}
                        className="rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-sage"
                      >
                        <option value="">選択してください</option>
                        {PREFECTURES.map((pref) => (
                          <option key={pref} value={pref}>
                            {pref}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-ink-soft">
                        説明（任意）
                      </span>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        placeholder="どんな場所か教えてください"
                        className="resize-none rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-sage"
                      />
                    </label>

                    <div className="flex gap-2">
                      {isEdit && (
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(true)}
                          className="rounded-full border border-ink/10 px-4 py-2.5 text-sm font-medium text-clay-dark transition hover:bg-ink/5"
                        >
                          削除
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setStep("confirm")}
                        disabled={!canProceed}
                        className="flex-1 rounded-full bg-sage px-4 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        次へ
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {step === "confirm" && (
        <div className="fixed inset-0 z-[1420] flex items-end justify-center bg-ink/15 backdrop-blur-sm sm:items-center">
          <div
            className="w-full max-w-md overflow-hidden rounded-t-[32px] border border-ink/[0.06] bg-cream p-6 sm:rounded-[32px]"
            style={{
              boxShadow:
                "0 1px 2px rgba(58,51,44,0.06), 0 12px 20px -8px rgba(58,51,44,0.18), 0 32px 64px -20px rgba(58,51,44,0.45)",
            }}
          >
            <h2 className="text-lg font-bold text-ink">
              この内容で{isEdit ? "保存" : "登録"}しますか？
            </h2>
            <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-sand/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 text-sage-dark"
                  aria-hidden="true"
                >
                  <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                <span className="text-sm font-medium text-ink">
                  {name.trim()}
                </span>
              </div>
              <p className="text-xs text-ink-soft">{prefecture}</p>
              {description.trim() && (
                <p className="text-xs text-ink-soft">{description.trim()}</p>
              )}
            </div>
            {error && <p className="mt-3 text-xs text-clay-dark">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setStep("picking")}
                className="flex-1 rounded-full border border-ink/10 px-4 py-3 text-sm font-medium text-ink-soft transition hover:bg-ink/5"
              >
                戻る
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 rounded-full bg-sage px-4 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-sage-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "保存中…" : isEdit ? "保存" : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="fixed inset-0 z-[1420] flex items-end justify-center bg-ink/15 backdrop-blur-sm sm:items-center">
          <div
            className="flex w-full max-w-md flex-col items-center gap-4 overflow-hidden rounded-t-[32px] border border-ink/[0.06] bg-cream px-6 py-10 text-center sm:rounded-[32px]"
            style={{
              boxShadow:
                "0 1px 2px rgba(58,51,44,0.06), 0 12px 20px -8px rgba(58,51,44,0.18), 0 32px 64px -20px rgba(58,51,44,0.45)",
            }}
          >
            <span className="text-4xl" aria-hidden="true">
              🌿
            </span>
            <p className="text-lg font-bold text-ink">
              スポットを{isEdit ? "保存しました" : "登録しました"}！
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 w-full rounded-full bg-sage px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-sage-dark"
            >
              地図へ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
