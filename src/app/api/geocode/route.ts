import { NextRequest, NextResponse } from "next/server";

// 地図上の「場所を検索してジャンプする」機能専用のジオコーディング（村民ピン・スポット登録とは無関係）。
// 優先順位: Google Places API(施設名・ランドマーク、最も精度が高いが有料) >
//          Yahoo!ローカルサーチ(施設名・ランドマーク) > Yahoo!ジオコーダ(住所) >
//          MapTiler Geocoding > Nominatim(OSM、キー不要の最終フォールバック)。
// いずれもCORS制限・APIキー秘匿のためブラウザから直接呼べず、この API Route を経由してサーバー側から呼び出す。
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const YAHOO_CLIENT_ID = process.env.YAHOO_CLIENT_ID;
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
};

// 各プロバイダとも稀に一時的なエラーを返すことがあり、そのまま次の(精度の劣る)
// プロバイダへフォールバックしてしまうと結果の質が落ちるため、1回だけ再試行する
async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = 1,
): Promise<Response> {
  let res = await fetch(url, init);
  for (let i = 0; i < retries && !res.ok; i++) {
    res = await fetch(url, init);
  }
  return res;
}

// 施設名・ランドマーク名の検索精度が最も高い（有料。月10,000件まで無料）
async function geocodeWithGooglePlaces(
  query: string,
): Promise<GeocodeResult | null> {
  const res = await fetchWithRetry(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "places.displayName,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: "ja",
        regionCode: "JP",
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  const place = data.places?.[0];
  if (!place) return null;
  return {
    lat: place.location.latitude,
    lng: place.location.longitude,
    label: place.displayName?.text ?? query,
  };
}

// Yahoo!のFeature配列(Geometry.Coordinatesが"経度,緯度")はローカルサーチ・ジオコーダ共通の形式
function parseYahooFeature(feature: {
  Name?: string;
  Geometry: { Coordinates: string };
  Property?: { Address?: string };
}): GeocodeResult {
  const [lng, lat] = feature.Geometry.Coordinates.split(",").map(Number);
  return {
    lat,
    lng,
    label: feature.Name ?? feature.Property?.Address ?? "",
  };
}

// 施設名・ランドマーク名(東京タワー、渋谷駅等)に強い。店舗・拠点情報(POI)を対象とする
async function geocodeWithYahooLocalSearch(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `https://map.yahooapis.jp/search/local/V1/localSearch?appid=${YAHOO_CLIENT_ID}&query=${encodeURIComponent(query)}&output=json&results=1&sort=score`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.Feature?.[0];
  return feature ? parseYahooFeature(feature) : null;
}

// 住所・町名に強い（施設名は苦手なことがある。ローカルサーチの後段フォールバックとして使う）
async function geocodeWithYahooGeocoder(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `https://map.yahooapis.jp/geocode/V1/geoCoder?appid=${YAHOO_CLIENT_ID}&query=${encodeURIComponent(query)}&output=json&results=1`;
  const res = await fetchWithRetry(url);
  if (!res.ok) return null;
  const data = await res.json();
  const feature = data.Feature?.[0];
  return feature ? parseYahooFeature(feature) : null;
}

async function geocodeWithMapTiler(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_API_KEY}&language=ja&country=jp&limit=1`;
  const res = await fetchWithRetry(url);
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
  const res = await fetchWithRetry(url);
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

  // 各サービスは得意分野が異なるため、該当なしの場合は次のサービスへ順に試す
  let result: GeocodeResult | null = null;
  if (GOOGLE_PLACES_API_KEY) result = await geocodeWithGooglePlaces(query);
  if (!result && YAHOO_CLIENT_ID) {
    result = await geocodeWithYahooLocalSearch(query);
    if (!result) result = await geocodeWithYahooGeocoder(query);
  }
  if (!result && MAPTILER_API_KEY) result = await geocodeWithMapTiler(query);
  if (!result) result = await geocodeWithNominatim(query);

  return NextResponse.json({ result });
}
