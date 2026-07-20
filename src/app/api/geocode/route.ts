import { NextRequest, NextResponse } from "next/server";

// 地図上の「場所を検索してジャンプする」機能専用のジオコーディング（村民ピン・スポット登録とは無関係）。
// 優先順位: Yahoo! JAPAN(YOLP) > MapTiler Geocoding > Nominatim(OSM、キー不要の最終フォールバック)。
// YOLPはCORS制限によりブラウザから直接呼べないため、この API Route を経由してサーバー側から呼び出す。
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

async function geocodeWithYahoo(query: string): Promise<GeocodeResult | null> {
  const url = `https://map.yahooapis.jp/geocode/V1/geoCoder?appid=${YAHOO_CLIENT_ID}&query=${encodeURIComponent(query)}&output=json&results=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.Feature?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.Geometry.Coordinates.split(",").map(Number);
  return {
    lat,
    lng,
    label: feature.Name ?? feature.Property?.Address ?? query,
  };
}

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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  // Yahoo!のジオコーダAPIは住所検索に強い一方、東京タワーのような建物・観光地名(POI)は
  // ヒットしないことがある。該当なしの場合は次のサービスへ順に試す
  let result: GeocodeResult | null = null;
  if (YAHOO_CLIENT_ID) result = await geocodeWithYahoo(query);
  if (!result && MAPTILER_API_KEY) result = await geocodeWithMapTiler(query);
  if (!result) result = await geocodeWithNominatim(query);

  return NextResponse.json({ result });
}
