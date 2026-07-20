// 村民ピンはprefectureを保存しない設計（フェーズ4）のため、都道府県フィルターで
// 村民側にも適用できるよう、県庁所在地に最も近い都道府県を都度計算する（DBには保存しない・
// 外部の逆ジオコーディングAPIも使わない、県庁所在地座標との直線距離による簡易な近似）
const PREFECTURE_CAPITALS: { name: string; lat: number; lng: number }[] = [
  { name: "北海道", lat: 43.0642, lng: 141.3469 },
  { name: "青森県", lat: 40.8244, lng: 140.74 },
  { name: "岩手県", lat: 39.7036, lng: 141.1527 },
  { name: "宮城県", lat: 38.2688, lng: 140.8721 },
  { name: "秋田県", lat: 39.7186, lng: 140.1024 },
  { name: "山形県", lat: 38.2404, lng: 140.3633 },
  { name: "福島県", lat: 37.75, lng: 140.4678 },
  { name: "茨城県", lat: 36.3418, lng: 140.4468 },
  { name: "栃木県", lat: 36.5658, lng: 139.8836 },
  { name: "群馬県", lat: 36.3911, lng: 139.0608 },
  { name: "埼玉県", lat: 35.8569, lng: 139.6489 },
  { name: "千葉県", lat: 35.6047, lng: 140.1233 },
  { name: "東京都", lat: 35.6895, lng: 139.6917 },
  { name: "神奈川県", lat: 35.4478, lng: 139.6425 },
  { name: "新潟県", lat: 37.9026, lng: 139.0236 },
  { name: "富山県", lat: 36.6953, lng: 137.2113 },
  { name: "石川県", lat: 36.5947, lng: 136.6256 },
  { name: "福井県", lat: 36.0652, lng: 136.2216 },
  { name: "山梨県", lat: 35.6642, lng: 138.5684 },
  { name: "長野県", lat: 36.6513, lng: 138.181 },
  { name: "岐阜県", lat: 35.3912, lng: 136.7223 },
  { name: "静岡県", lat: 34.9769, lng: 138.3831 },
  { name: "愛知県", lat: 35.1815, lng: 136.9066 },
  { name: "三重県", lat: 34.7303, lng: 136.5086 },
  { name: "滋賀県", lat: 35.0045, lng: 135.8686 },
  { name: "京都府", lat: 35.0116, lng: 135.7681 },
  { name: "大阪府", lat: 34.6937, lng: 135.5023 },
  { name: "兵庫県", lat: 34.6913, lng: 135.183 },
  { name: "奈良県", lat: 34.6851, lng: 135.8329 },
  { name: "和歌山県", lat: 34.226, lng: 135.1675 },
  { name: "鳥取県", lat: 35.5039, lng: 134.2382 },
  { name: "島根県", lat: 35.4723, lng: 133.0505 },
  { name: "岡山県", lat: 34.6618, lng: 133.9344 },
  { name: "広島県", lat: 34.3966, lng: 132.4596 },
  { name: "山口県", lat: 34.1859, lng: 131.4714 },
  { name: "徳島県", lat: 34.0658, lng: 134.5593 },
  { name: "香川県", lat: 34.3401, lng: 134.0434 },
  { name: "愛媛県", lat: 33.8417, lng: 132.7657 },
  { name: "高知県", lat: 33.5597, lng: 133.5311 },
  { name: "福岡県", lat: 33.5904, lng: 130.4017 },
  { name: "佐賀県", lat: 33.2494, lng: 130.2988 },
  { name: "長崎県", lat: 32.7448, lng: 129.8737 },
  { name: "熊本県", lat: 32.7898, lng: 130.7417 },
  { name: "大分県", lat: 33.2382, lng: 131.6126 },
  { name: "宮崎県", lat: 31.9111, lng: 131.4239 },
  { name: "鹿児島県", lat: 31.5602, lng: 130.5581 },
  { name: "沖縄県", lat: 26.2124, lng: 127.6809 },
];

function haversineDistance(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestPrefecture(position: [number, number]): string {
  let closest = PREFECTURE_CAPITALS[0];
  let closestDistance = Infinity;
  for (const capital of PREFECTURE_CAPITALS) {
    const distance = haversineDistance(position, [capital.lat, capital.lng]);
    if (distance < closestDistance) {
      closest = capital;
      closestDistance = distance;
    }
  }
  return closest.name;
}
