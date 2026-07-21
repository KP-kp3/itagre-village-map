"use client";

import { useEffect, useState } from "react";
import {
  geocode,
  suggest,
  getPlaceDetails,
  type Suggestion,
} from "@/lib/geocode";

// 地図上の「場所を検索してジャンプする」UI。VillageMap（一覧用の地図）・
// PinPlacementFlow・SpotFormFlow（ピン設置・スポット登録の地図）で共通して使う。
// 見つかった座標をどう使うか(map.flyTo/tempPositionの設定等)は呼び出し側に任せる
type Props = {
  onFound: (lat: number, lng: number) => void;
};

const SUGGEST_DEBOUNCE_MS = 300;

export default function LocationSearchBox({ onFound }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  // 入力に合わせて候補を取得する(Google Places未設定の場合は常に空のまま)
  useEffect(() => {
    if (!searchQuery.trim()) {
      // 入力が空になったことに合わせて候補をクリアする意図的なsetState
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await suggest(searchQuery);
      setSuggestions(results);
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;

    setShowSuggestions(false);
    setSearching(true);
    setSearchError(null);
    try {
      const result = await geocode(searchQuery.trim());
      if (!result) {
        setSearchError("見つかりませんでした");
        return;
      }
      onFound(result.lat, result.lng);
    } catch {
      setSearchError("検索中にエラーが発生しました");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSuggestion = async (s: Suggestion) => {
    setSelectingId(s.placeId);
    setSearchError(null);
    try {
      const result = await getPlaceDetails(s.placeId);
      if (!result) {
        setSearchError("見つかりませんでした");
        return;
      }
      setSearchQuery(s.text);
      setShowSuggestions(false);
      onFound(result.lat, result.lng);
    } catch {
      setSearchError("検索中にエラーが発生しました");
    } finally {
      setSelectingId(null);
    }
  };

  const handleLocate = () => {
    if (locating) return;

    if (!navigator.geolocation) {
      setSearchError("この端末では現在地を取得できません");
      return;
    }

    setLocating(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onFound(position.coords.latitude, position.coords.longitude);
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
    <form
      onSubmit={handleSearch}
      className="fixed left-4 top-20 z-[1050] flex flex-col items-start gap-1.5"
    >
      <div className="flex items-center gap-2">
        <div className="relative">
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
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // クリック選択を先に処理させるため少し遅らせて閉じる
                setTimeout(() => setShowSuggestions(false), 150);
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

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute left-0 top-[calc(100%+6px)] w-full min-w-[260px] overflow-hidden rounded-2xl bg-cream/95 py-1.5 shadow-[0_8px_24px_-8px_rgba(58,51,44,0.35)] backdrop-blur-md">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(s)}
                    disabled={selectingId === s.placeId}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink transition hover:bg-sand/60 disabled:opacity-50"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0 text-ink-soft"
                      aria-hidden="true"
                    >
                      <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <span className="truncate">{s.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
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
  );
}
