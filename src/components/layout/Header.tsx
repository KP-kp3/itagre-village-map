"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import VillagerFormModal from "@/components/profile/VillagerFormModal";

type Props = {
  onOpenPinFlow: () => void;
  onOpenSpotFlow: () => void;
};

export default function Header({ onOpenPinFlow, onOpenSpotFlow }: Props) {
  const { user, profile, villager, loading, signInWithDiscord, signOut } =
    useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const hasPin = !!(villager?.lat != null && villager?.lng != null);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[1000] border-b border-ink/5 bg-cream/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo/itagre-village.png"
              alt="ITAGRE Village"
              width={1024}
              height={1024}
              priority
              className="h-10 w-auto sm:h-12"
            />
            <span className="text-xs font-medium text-ink-soft sm:text-sm">
              Village Map
            </span>
          </div>

          {loading ? null : user ? (
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
              <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                {profile?.discord_avatar_url && (
                  <Image
                    src={profile.discord_avatar_url}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full"
                  />
                )}
                <span className="hidden max-w-[6rem] truncate text-sm font-medium text-ink sm:inline sm:max-w-none">
                  {profile?.discord_username ?? "村民"}
                </span>
              </span>

              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className={
                  villager
                    ? "shrink-0 rounded-full border border-ink/10 px-3 py-2 text-xs font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:px-4 sm:text-sm"
                    : "shrink-0 rounded-full bg-teal px-3 py-2 text-xs font-semibold text-cream shadow-sm transition hover:bg-teal-dark sm:px-4 sm:text-sm"
                }
              >
                <span className="hidden sm:inline">
                  {villager ? "プロフィールを編集" : "マップに登録"}
                </span>
                <span className="sm:hidden">{villager ? "編集" : "登録"}</span>
              </button>

              {villager && (
                <button
                  type="button"
                  onClick={onOpenPinFlow}
                  aria-label={hasPin ? "ピンを編集する" : "ピンを設置する"}
                  title={hasPin ? "ピンを編集する" : "ピンを設置する"}
                  className={
                    hasPin
                      ? "shrink-0 rounded-full border border-ink/10 p-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:px-3"
                      : "shrink-0 rounded-full border border-teal/30 bg-teal/10 p-2 text-teal-dark transition hover:bg-teal/20 sm:px-3"
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  <span className="hidden sm:inline sm:ml-1.5 sm:text-sm sm:font-medium">
                    {hasPin ? "ピンを編集" : "ピンを設置"}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onOpenSpotFlow}
                aria-label="スポットを登録する"
                title="スポットを登録する"
                className="shrink-0 rounded-full border border-sage/30 bg-sage/10 p-2 text-sage-dark transition hover:bg-sage/20 sm:px-3"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z" />
                  <path d="M12 6v6M9 9h6" />
                </svg>
                <span className="hidden sm:ml-1.5 sm:inline sm:text-sm sm:font-medium">
                  スポットを登録
                </span>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                aria-label="ログアウト"
                title="ログアウト"
                className="shrink-0 rounded-full p-2 text-ink-soft transition hover:bg-ink/5 hover:text-ink sm:px-4 sm:text-sm sm:font-medium sm:border sm:border-ink/10"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sm:hidden"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path d="M16 17l5-5-5-5" />
                  <path d="M21 12H9" />
                </svg>
                <span className="hidden sm:inline">ログアウト</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signInWithDiscord()}
              className="flex items-center gap-1.5 rounded-full bg-teal px-3.5 py-2 text-xs font-medium text-cream shadow-sm transition hover:bg-teal-dark sm:px-4 sm:text-sm"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.2 14.2 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128q.189-.14.363-.287a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.073.073 0 0 1 .079.009q.174.148.363.288a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.04.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.662a.06.06 0 0 0-.031-.028M8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419m7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.175 1.094 2.157 2.418 0 1.334-.947 2.419-2.157 2.419" />
              </svg>
              <span className="hidden sm:inline">Discordでログイン</span>
              <span className="sm:hidden">ログイン</span>
            </button>
          )}
        </div>
      </header>
      <VillagerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onRequestPinFlow={() => {
          setFormOpen(false);
          onOpenPinFlow();
        }}
      />
    </>
  );
}
