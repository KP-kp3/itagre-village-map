// 地図上の「場所を検索してジャンプする」機能専用のクライアント側ヘルパー。
// 実際のジオコーディング（Yahoo!/MapTiler/Nominatimの優先順位切り替え）は
// CORSの都合上サーバー側の src/app/api/geocode/route.ts で行う。
export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

export async function geocode(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}
