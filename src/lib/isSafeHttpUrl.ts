// ユーザー入力のURL（Instagramリンク等）をhrefとしてそのまま描画する前のチェック。
// javascript:等の危険なスキームを弾く(全員が閲覧できる公開データのため、登録者本人だけでなく
// 閲覧者側も守るdefense-in-depthとしてフォーム送信時・表示時の両方で使う)
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
