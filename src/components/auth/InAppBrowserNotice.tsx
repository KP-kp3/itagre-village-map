"use client";

import { useEffect, useState } from "react";

// Discordアプリ内蔵ブラウザではPKCE認証に必要なcode_verifierの永続化が
// うまくいかず、認証自体は完了してもログイン状態にならないことがある。
// 外部ブラウザで開くよう促す通知。Androidはintent://スキームで自動的に
// Chromeへの遷移を試みる。iOSはOSの制限上、JSから強制的にSafariを
// 開かせる確実な方法がないため、ワンタップの案内リンクを出すのみに留める
function isDiscordInAppBrowser(userAgent: string): boolean {
  return /\bDiscord\b/i.test(userAgent);
}

function tryOpenInChrome() {
  const { protocol, host, pathname, search } = window.location;
  const scheme = protocol.replace(":", "");
  const intentUrl = `intent://${host}${pathname}${search}#Intent;scheme=${scheme};package=com.android.chrome;end;`;
  window.location.href = intentUrl;
}

export default function InAppBrowserNotice() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (!isDiscordInAppBrowser(ua)) return;

    const android = /Android/i.test(ua);

    // ブラウザ環境の検知結果を反映する意図的なsetState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAndroid(android);
    setCurrentUrl(window.location.href);
    setVisible(true);
    const enterId = requestAnimationFrame(() => setEntered(true));

    if (android) {
      tryOpenInChrome();
    }

    return () => cancelAnimationFrame(enterId);
  }, []);

  if (!visible) return null;

  const handleClose = () => {
    setEntered(false);
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <div
      className={`fixed inset-x-0 top-56 z-[2000] flex justify-center px-4 transition-all duration-300 ${
        entered ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
      }`}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border border-ink/5 bg-cream/95 px-5 py-4 shadow-[0_12px_48px_-12px_rgba(58,51,44,0.4)] backdrop-blur-md"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <span className="text-sm text-ink">
            Discordアプリ内のブラウザでは、ログインが正しく完了しないことがあります。
            {isAndroid
              ? "Chromeでの再読み込みを試みています…"
              : "ブラウザで開き直してください。"}
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
        {!isAndroid && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full rounded-full bg-teal px-4 py-2 text-center text-sm font-semibold text-cream shadow-sm transition hover:bg-teal-dark"
          >
            ブラウザで開く
          </a>
        )}
      </div>
    </div>
  );
}
