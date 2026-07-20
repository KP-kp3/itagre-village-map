"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "itagre-village-map:welcomed";
const VISIBLE_DURATION_MS = 2000;
const FADE_DURATION_MS = 500;

export default function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    window.localStorage.setItem(STORAGE_KEY, "1");

    // localStorageという外部システムを読んだ結果を反映するための同期であり、意図的なsetState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    const enterId = requestAnimationFrame(() => setEntered(true));
    const leaveTimer = setTimeout(() => setEntered(false), VISIBLE_DURATION_MS);
    const removeTimer = setTimeout(
      () => setVisible(false),
      VISIBLE_DURATION_MS + FADE_DURATION_MS
    );

    return () => {
      cancelAnimationFrame(enterId);
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center bg-ink/5 backdrop-blur-[2px] transition-opacity duration-[500ms] ${
        entered ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`mx-4 flex max-w-sm flex-col items-center gap-2 rounded-3xl border border-ink/5 bg-cream/95 px-8 py-7 text-center shadow-[0_12px_48px_-12px_rgba(58,51,44,0.4)] transition-all duration-[500ms] ${
          entered ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <span className="text-2xl" aria-hidden="true">
          🐾
        </span>
        <p className="text-base font-bold text-ink">
          Welcome to ITAGRE Village Map
        </p>
        <p className="text-sm text-ink-soft">村のみんながつながる場所</p>
      </div>
    </div>
  );
}
