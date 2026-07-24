"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/components/auth/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { uploadVillagerPhoto } from "@/lib/supabase/uploadVillagerPhoto";
import { validateImageFile } from "@/lib/validateImageFile";
import { isSafeHttpUrl } from "@/lib/isSafeHttpUrl";

const BIO_MAX = 100;

type Props = {
  open: boolean;
  onClose: () => void;
  onRequestPinFlow: () => void;
};

export default function VillagerFormModal({
  open,
  onClose,
  onRequestPinFlow,
}: Props) {
  const { user, profile, villager, refreshVillager } = useAuth();
  const mode = villager ? "edit" : "create";

  const [entered, setEntered] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [birthday, setBirthday] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    // フォームを開くたびに現在の登録内容（未登録ならDiscordアイコン）で初期化する意図的なsetState
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(villager?.dog_name ?? "");
    setBio(villager?.bio ?? "");
    setInstagramUrl(villager?.instagram_url ?? "");
    setBirthday(villager?.birthday ?? "");
    setPhotoUrl(villager?.photo_url ?? profile?.discord_avatar_url ?? null);
    setPendingFile(null);
    setPreviewUrl(null);
    setError(null);
    setJustRegistered(false);
    setEntered(false);
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!pendingFile) {
      // 選択中のファイルが外部からクリアされたことに合わせてプレビューURLを同期する意図的なsetState
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  if (!open) return null;

  const displayPhoto = previewUrl ?? photoUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      e.target.value = "";
      return;
    }
    setError(null);
    setPendingFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim() || submitting) return;

    const trimmedInstagramUrl = instagramUrl.trim();
    if (trimmedInstagramUrl && !isSafeHttpUrl(trimmedInstagramUrl)) {
      setError(
        "Instagramリンクの形式が正しくありません（例：https://instagram.com/...）",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let finalPhotoUrl = photoUrl;
      if (pendingFile) {
        finalPhotoUrl = await uploadVillagerPhoto(user.id, pendingFile);
      }

      const supabase = createClient();
      const payload = {
        dog_name: name.trim(),
        bio: bio.trim() ? bio.trim() : null,
        instagram_url: trimmedInstagramUrl ? trimmedInstagramUrl : null,
        birthday: birthday ? birthday : null,
        photo_url: finalPhotoUrl,
      };

      if (mode === "create") {
        const { error: insertError } = await supabase
          .from("villagers")
          .insert({ user_id: user.id, ...payload });
        if (insertError) throw insertError;
        await refreshVillager();
        setJustRegistered(true);
      } else {
        const { error: updateError } = await supabase
          .from("villagers")
          .update(payload)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
        await refreshVillager();
        onClose();
      }
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

  return (
    <div
      className={`fixed inset-0 z-[1300] flex items-end justify-center bg-ink/15 backdrop-blur-sm transition-opacity duration-300 sm:items-center ${
        entered ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md overflow-hidden rounded-t-[32px] border border-ink/[0.06] bg-cream sm:rounded-[32px] ${
          entered ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        } transition-all duration-300 ease-out`}
        style={{
          boxShadow:
            "0 1px 2px rgba(58,51,44,0.06), 0 12px 20px -8px rgba(58,51,44,0.18), 0 32px 64px -20px rgba(58,51,44,0.45)",
        }}
      >
        {justRegistered ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <span className="text-4xl" aria-hidden="true">
              🎉
            </span>
            <p className="text-lg font-bold text-ink">
              マップへの登録が完了しました！
            </p>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              地図にはまだ表示されていません。お気に入りの場所にピンを設置すると、村民ピンとして表示されます。
            </p>
            <button
              type="button"
              onClick={onRequestPinFlow}
              className="mt-2 w-full rounded-full bg-teal px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-teal-dark"
            >
              ピンを設置する
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-ink-soft underline-offset-2 hover:underline"
            >
              あとで設置する
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5 px-6 py-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {mode === "create" ? "マップに登録" : "プロフィールを編集"}
              </h2>
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

            <div className="flex flex-col items-center gap-3">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-sand ring-4 ring-cream">
                {displayPhoto && (
                  <Image
                    src={displayPhoto}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full border border-ink/10 px-4 py-1.5 text-xs font-medium text-ink-soft transition hover:bg-ink/5 hover:text-ink"
              >
                画像を変更
              </button>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">名前</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="例：ソラ"
                className="rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-teal"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-soft">
                  紹介文
                </span>
                <span className="text-[11px] text-ink-soft">
                  {bio.length} / {BIO_MAX}
                </span>
              </div>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                maxLength={BIO_MAX}
                rows={3}
                placeholder="自己紹介やお気に入りのことなど"
                className="resize-none rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-teal"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">
                Instagramリンク（任意）
              </span>
              <input
                type="url"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="https://instagram.com/xxxxx"
                className="rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-teal"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">
                誕生日（任意）
              </span>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="rounded-2xl border border-ink/10 bg-cream px-4 py-2.5 text-sm text-ink outline-none transition focus:border-teal"
              />
            </label>

            {error && <p className="text-xs text-clay-dark">{error}</p>}

            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="w-full rounded-full bg-teal px-5 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "保存中…"
                : mode === "create"
                  ? "登録する"
                  : "保存する"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
