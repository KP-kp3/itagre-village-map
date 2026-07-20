export type LatLng = [number, number];

// 村民ピンは居住地ではない。「調布駅」「よく行くドッグラン」等、
// 村民が任意で選んだ1箇所を表す（placeNameがその場所の名前）。
// 住所的な情報(prefecture)は持たない。表示するのは画像・名前・紹介文・場所名の4つ。
export type Resident = {
  id: string;
  dogName: string;
  placeName: string;
  bio: string;
  photoUrl: string | null;
  position: LatLng;
  createdAt: string;
};

export type SpotCategory = "spot" | "event" | "shop";

export type Spot = {
  id: string;
  category: SpotCategory;
  name: string;
  prefecture: string;
  description: string;
  position: LatLng;
  createdAt: string;
  registrantName: string | null;
};

export type SelectedMapItem =
  | { type: "resident"; data: Resident }
  | { type: "spot"; data: Spot }
  | null;
