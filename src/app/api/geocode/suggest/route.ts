import { NextRequest, NextResponse } from "next/server";

// 検索ボックスの入力中に候補（サジェスト）を出すための軽量API。
// Google Places Autocomplete (New) は候補のテキストとplaceIdのみを返し、座標は含まない
// （座標が欲しい場合は選択後にsrc/app/api/geocode/place/route.tsでPlace Detailsを別途呼ぶ）。
// Google Places以外のプロバイダは同等のオートコンプリートAPIを持たないため、
// GOOGLE_PLACES_API_KEY未設定の場合は候補なし(空配列)を返す
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || !GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ suggestions: [] });
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      },
      body: JSON.stringify({
        input: query,
        languageCode: "ja",
        regionCode: "JP",
      }),
    },
  );
  if (!res.ok) return NextResponse.json({ suggestions: [] });

  const data = await res.json();
  const suggestions = (data.suggestions ?? [])
    .filter((s: { placePrediction?: unknown }) => s.placePrediction)
    .slice(0, 5)
    .map(
      (s: {
        placePrediction: { placeId: string; text?: { text?: string } };
      }) => ({
        placeId: s.placePrediction.placeId,
        text: s.placePrediction.text?.text ?? "",
      }),
    );

  return NextResponse.json({ suggestions });
}
