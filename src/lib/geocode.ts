// 地図上の「場所を検索してジャンプする」機能専用のクライアント側ヘルパー。
// 実際のジオコーディング（Google Places/Yahoo!/MapTiler/Nominatimの優先順位切り替え）は
// CORSの都合上サーバー側の src/app/api/geocode/ 配下で行う。
export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

export type Suggestion = {
  placeId: string;
  // Googleマップの候補表示と同じ2段組み用（mainText: スポット名、secondaryText: 住所）
  mainText: string;
  secondaryText: string;
};

// 確定検索（Enter/検索ボタン）。複数プロバイダの中から最初に見つかった1件を返す
export async function geocode(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

// 入力中の候補表示用（Google Places未設定の場合は常に空配列）
export async function suggest(query: string): Promise<Suggestion[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `/api/geocode/suggest?q=${encodeURIComponent(query.trim())}`,
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.suggestions ?? [];
}

// 候補を選択した後、その座標を取得する
export async function getPlaceDetails(
  placeId: string,
): Promise<GeocodeResult | null> {
  const res = await fetch(
    `/api/geocode/place?placeId=${encodeURIComponent(placeId)}`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}
