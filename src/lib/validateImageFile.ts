export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ファイル選択時・アップロード直前の両方から呼ぶ共通バリデーション。
// <input accept="image/*"> はUI上のヒントに過ぎず強制力がないため、実際のfile.typeを確認する。
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "画像ファイルを選択してください。";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "画像サイズは5MB以下にしてください。";
  }
  return null;
}
