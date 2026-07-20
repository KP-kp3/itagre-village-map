// 地図上の「場所を検索してジャンプする」機能専用のジオコーディング。
// ピン設置・スポット登録フローとは無関係（そちらは意図的に地図クリックのみで完結させている）。
// MapTilerのAPIキーがあればMapTiler Geocoding APIを、無ければAPIキー不要のNominatim(OSM)を使う
// （地図タイルの切り替え方針 src/lib/mapBrandStyle.ts と同じパターン）
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

async function geocodeWithMapTiler(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_API_KEY}&language=ja&country=jp&limit=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.center;
  return { lat, lng, label: feature.place_name as string };
}

async function geocodeWithNominatim(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=jp&accept-language=ja`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const result = data[0];
  if (!result) return null;
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    label: result.display_name as string,
  };
}

export async function geocode(query: string): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  return MAPTILER_API_KEY
    ? geocodeWithMapTiler(query)
    : geocodeWithNominatim(query);
}
