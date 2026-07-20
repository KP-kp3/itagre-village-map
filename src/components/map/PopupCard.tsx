"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import type { SelectedMapItem, Spot } from "@/types/village";

type Props = {
  selected: SelectedMapItem;
  onClose: () => void;
  onEditSpot: (spot: Spot) => void;
};

export default function PopupCard({ selected, onClose, onEditSpot }: Props) {
  const { user } = useAuth();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!selected) return;

    // マウント直後にtrueにすることでCSSトランジションを発火させるための意図的なsetState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [selected]);

  if (!selected) return null;

  const isResident = selected.type === "resident";
  const title = isResident ? selected.data.dogName : selected.data.name;
  const prefecture = isResident ? null : selected.data.prefecture;
  const body = isResident ? selected.data.bio : selected.data.description;
  const photoUrl = isResident ? selected.data.photoUrl : null;
  const isOwnSpot = !isResident && !!user && user.id === selected.data.userId;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-[1100] transition-all duration-300 ease-out sm:inset-x-auto sm:bottom-6 sm:left-6 ${
        entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div
        className="mx-auto w-full max-w-md overflow-hidden rounded-t-[32px] border border-ink/[0.06] bg-cream/95 backdrop-blur-md sm:w-[392px] sm:rounded-[32px]"
        style={{
          boxShadow:
            "0 1px 2px rgba(58,51,44,0.06), 0 12px 20px -8px rgba(58,51,44,0.18), 0 32px 64px -20px rgba(58,51,44,0.45)",
        }}
      >
        <div
          className={`relative flex h-40 w-full items-center justify-center bg-gradient-to-br from-sand via-sand ${
            isResident ? "to-teal/25" : "to-sage/30"
          }`}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <span className="text-6xl drop-shadow-sm" aria-hidden="true">
              {isResident ? "🐕" : "📍"}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="absolute right-3.5 top-3.5 rounded-full bg-cream/90 p-2 text-ink-soft shadow-sm transition duration-150 hover:scale-110 hover:bg-cream hover:text-ink active:scale-95"
          >
            <svg
              width="15"
              height="15"
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

        <div className="px-6 pb-6 pt-5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider ${
              isResident
                ? "bg-teal/12 text-teal-dark"
                : "bg-sage/15 text-sage-dark"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isResident ? "bg-teal" : "bg-sage"}`}
            />
            {isResident ? "村民" : prefecture}
          </span>

          <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">
            {title}
          </h2>

          {isResident && (
            <>
              <p className="mt-1 flex items-center gap-1 text-[13px] text-ink-soft">
                <svg
                  width="12"
                  height="12"
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
                {selected.data.placeName}
              </p>
            </>
          )}

          <div className="mt-4 border-t border-ink/[0.06] pt-4">
            <p className="text-[13.5px] leading-[1.8] text-ink-soft">{body}</p>
          </div>

          {isOwnSpot && (
            <button
              type="button"
              onClick={() => onEditSpot(selected.data as Spot)}
              className="mt-4 w-full rounded-full border border-ink/10 px-4 py-2.5 text-sm font-medium text-sage-dark transition hover:bg-sage/10"
            >
              このスポットを編集
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
