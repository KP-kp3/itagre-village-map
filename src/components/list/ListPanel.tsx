"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { PREFECTURES } from "@/data/prefectures";
import { nearestPrefecture } from "@/lib/nearestPrefecture";
import type { Resident, Spot } from "@/types/village";

type Tab = "residents" | "spots";

type Props = {
  open: boolean;
  onClose: () => void;
  residents: Resident[];
  spots: Spot[];
  onSelectResident: (resident: Resident) => void;
  onSelectSpot: (spot: Spot) => void;
};

export default function ListPanel({
  open,
  onClose,
  residents,
  spots,
  onSelectResident,
  onSelectSpot,
}: Props) {
  const [tab, setTab] = useState<Tab>("residents");
  const [query, setQuery] = useState("");
  const [prefecture, setPrefecture] = useState("");

  const filteredResidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return residents
      .filter((r) => !q || r.dogName.toLowerCase().includes(q))
      .filter(
        (r) => !prefecture || nearestPrefecture(r.position) === prefecture,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [residents, query, prefecture]);

  const filteredSpots = useMemo(() => {
    const q = query.trim().toLowerCase();
    return spots
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .filter((s) => !prefecture || s.prefecture === prefecture)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [spots, query, prefecture]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1250] flex items-end justify-center bg-ink/15 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] border border-ink/[0.06] bg-cream sm:rounded-[32px]"
        style={{
          boxShadow:
            "0 1px 2px rgba(58,51,44,0.06), 0 12px 20px -8px rgba(58,51,44,0.18), 0 32px 64px -20px rgba(58,51,44,0.45)",
        }}
      >
        <div className="flex items-center justify-between px-6 pt-6">
          <h2 className="text-lg font-bold text-ink">一覧</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-full p-1.5 text-ink-soft transition hover:bg-ink/5 hover:text-ink"
          >
            <svg
              width="16"
              height="16"
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

        <div className="flex gap-2 px-6 pt-4">
          <button
            type="button"
            onClick={() => setTab("residents")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "residents"
                ? "bg-teal text-cream shadow-sm"
                : "bg-sand/60 text-ink-soft"
            }`}
          >
            🐾 村民 ({filteredResidents.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("spots")}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "spots"
                ? "bg-sage text-cream shadow-sm"
                : "bg-sand/60 text-ink-soft"
            }`}
          >
            📍 スポット ({filteredSpots.length})
          </button>
        </div>

        <div className="flex gap-2 px-6 pt-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "residents" ? "名前で検索" : "スポット名で検索"
            }
            className="flex-1 rounded-2xl border border-ink/10 bg-cream px-4 py-2 text-sm text-ink outline-none transition focus:border-teal"
          />
          <select
            value={prefecture}
            onChange={(e) => setPrefecture(e.target.value)}
            className="w-28 shrink-0 rounded-2xl border border-ink/10 bg-cream px-2 py-2 text-xs text-ink outline-none transition focus:border-teal"
          >
            <option value="">都道府県</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-3 pb-6">
          {tab === "residents" ? (
            filteredResidents.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-ink-soft">
                該当する村民が見つかりませんでした。
              </p>
            ) : (
              filteredResidents.map((resident) => (
                <button
                  key={resident.id}
                  type="button"
                  onClick={() => {
                    onSelectResident(resident);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-sand/50"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-sand ring-1 ring-ink/[0.06]">
                    {resident.photoUrl && (
                      <Image
                        src={resident.photoUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {resident.dogName}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-soft">
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="shrink-0"
                        aria-hidden="true"
                      >
                        <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                      {resident.placeName}
                    </p>
                  </div>
                </button>
              ))
            )
          ) : filteredSpots.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-soft">
              該当するスポットが見つかりませんでした。
            </p>
          ) : (
            filteredSpots.map((spot) => (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  onSelectSpot(spot);
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-sand/50"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage/15 text-sage-dark">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {spot.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-soft">
                    {spot.prefecture}
                    {spot.registrantName && <> ・ {spot.registrantName}</>}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
