"use client";

import { useEffect, useState } from "react";

// ITAGRE VillageのDiscordサーバーのメンバーでないためログインをブロックされた場合に表示する通知。
// src/app/auth/callback/route.ts が ?error=not_member 付きでリダイレクトしてきた時のみ表示する
export default function AccessDeniedNotice() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") !== "not_member") return;

    // URLパラメータという外部状態を読んだ結果を反映するための意図的なsetState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const enterId = requestAnimationFrame(() => setEntered(true));

    // リロード時に再表示されないようURLをきれいにする
    const url = new URL(window.location.href);
    url.searchParams.delete("error");
    window.history.replaceState({}, "", url.toString());

    return () => cancelAnimationFrame(enterId);
  }, []);

  if (!visible) return null;

  const handleClose = () => {
    setEntered(false);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <div
      className={`fixed inset-x-0 top-40 z-[2000] flex justify-center px-4 transition-all duration-300 ${
        entered ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      <div
        className="flex max-w-sm items-center gap-3 rounded-full border border-ink/5 bg-cream/95 px-5 py-3 shadow-[0_12px_48px_-12px_rgba(58,51,44,0.4)] backdrop-blur-md"
        role="alert"
      >
        <span className="text-sm text-ink">
          ITAGRE
          Villageサーバーのメンバーではないため、ログインできませんでした。
        </span>
        <button
          type="button"
          onClick={handleClose}
          aria-label="閉じる"
          className="shrink-0 text-ink-soft transition hover:text-ink"
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
  );
}
