import { NextRequest, NextResponse } from "next/server";

// サジェスト(オートコンプリート候補)をユーザーが選んだ後に、その座標を取得するAPI。
// Google Places Autocompleteのレスポンスには座標が含まれないため、
// 選択されたplaceIdでPlace Details (New) を別途呼ぶ必要がある
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId || !GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({ result: null });
  }

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=ja`,
    {
      headers: {
        "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": "displayName,location",
      },
    },
  );
  if (!res.ok) return NextResponse.json({ result: null });

  const data = await res.json();
  return NextResponse.json({
    result: {
      lat: data.location.latitude,
      lng: data.location.longitude,
      label: data.displayName?.text ?? "",
    },
  });
}
