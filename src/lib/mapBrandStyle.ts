import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// docs/CLAUDE.md「地図スタイル方針」で確定した配色（3. ぬくもりイラスト風）
// roadMinor/buildingは陸地との視認性確保のため、確定時よりやや彩度・明度を強めている
export const MAP_BRAND_COLORS = {
  land: "#F6EEE0",
  water: "#AEC4C4",
  waterLine: "#8FADAD", // 河川等の線は面より濃くしないと陸地に対して視認しづらいため専用色
  park: "#C9D3B0",
  roadMajor: "#E8B99A",
  roadMinor: "#E9D2AE",
  building: "#E6D2B2",
  buildingOutline: "#D2B78C",
  label: "#6B5940",
  labelHalo: "#FBF6EF",
};

// MapLibreの data-driven expression: class属性で主要道路/細街路を判定する。
// OpenFreeMap（クラスごとに個別レイヤー）・MapTiler（1レイヤーにclass式で統合）の
// どちらでも、featureのclass値を見て判定するため同じ式で両対応できる。
const ROAD_COLOR_EXPRESSION = [
  "match",
  ["get", "class"],
  ["motorway", "trunk", "primary"],
  MAP_BRAND_COLORS.roadMajor,
  MAP_BRAND_COLORS.roadMinor,
];

function isRailOrTransit(id: string) {
  const lower = id.toLowerCase();
  return lower.includes("rail") || lower.includes("transit");
}

/**
 * OpenFreeMap / MapTilerはどちらもOpenMapTilesスキーマ（source-layer名が共通）を使うため、
 * 同じロジックでブランドカラーを両方に適用できる。レイヤー構成の細部（1クラス1レイヤー vs
 * 複数クラス統合レイヤー）が異なるため、色は原則classの値で判定するdata-driven expressionにしている。
 */
export function applyBrandPalette(style: StyleSpecification): StyleSpecification {
  const layers = style.layers.map((layer): LayerSpecification => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const next = { ...layer, paint: { ...(layer as any).paint } } as any;

    if (layer.type === "background") {
      next.paint["background-color"] = MAP_BRAND_COLORS.land;
      return next;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sourceLayer = (layer as any)["source-layer"];
    const idLower = layer.id.toLowerCase();

    if (sourceLayer === "water" && layer.type === "fill") {
      next.paint["fill-color"] = MAP_BRAND_COLORS.water;
    } else if (sourceLayer === "waterway" && layer.type === "line") {
      // 河川等の線は面(water)と同じ色だと陸地に対して薄すぎるため、専用の濃い色にする
      next.paint["line-color"] = MAP_BRAND_COLORS.waterLine;
    } else if (sourceLayer === "park" && layer.type === "fill") {
      next.paint["fill-color"] = MAP_BRAND_COLORS.park;
    } else if (sourceLayer === "landcover" && layer.type === "fill") {
      if (idLower.includes("wood") || idLower.includes("grass")) {
        next.paint["fill-color"] = MAP_BRAND_COLORS.park;
      }
      // sand等それ以外の細かい地被は既定色のまま（パレット未定義のため変更しない）
    } else if (sourceLayer === "globallandcover" && layer.type === "fill") {
      // 低ズームの広域植生・氷河レイヤーはイラスト風の平坦な陸地表現と相性が悪いため非表示にする
      next.layout = { ...(next.layout ?? {}), visibility: "none" };
    } else if (sourceLayer === "building") {
      if (layer.type === "fill") {
        next.paint["fill-color"] = MAP_BRAND_COLORS.building;
        next.paint["fill-outline-color"] = MAP_BRAND_COLORS.buildingOutline;
      }
      if (layer.type === "fill-extrusion") next.paint["fill-extrusion-color"] = MAP_BRAND_COLORS.building;
    } else if (sourceLayer === "transportation" && layer.type === "line" && !isRailOrTransit(idLower)) {
      next.paint["line-color"] = ROAD_COLOR_EXPRESSION;
    }

    if (layer.type === "symbol") {
      next.paint["text-color"] = MAP_BRAND_COLORS.label;
      next.paint["text-halo-color"] = MAP_BRAND_COLORS.labelHalo;
      next.paint["text-halo-width"] = 1.2;
    }

    return next;
  });

  return { ...style, layers };
}

// MapLibre GL JSはブラウザ上で直接MapTilerのタイルを取得するため、
// Next.jsの仕様上 NEXT_PUBLIC_ プレフィックスが無いとブラウザ側に値が渡らない。
// .env.local には NEXT_PUBLIC_MAPTILER_API_KEY として設定する。
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

// APIキー未設定時は登録不要の無料ベクタータイル(OpenFreeMap)にフォールバックする。
// キー設定後はこの関数の戻り値を変えるだけでMapTilerへ切り替わる。
export function getBaseStyleUrl() {
  return MAPTILER_API_KEY
    ? `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_API_KEY}`
    : "https://tiles.openfreemap.org/styles/liberty";
}

export async function loadBrandedStyle(): Promise<StyleSpecification> {
  const res = await fetch(getBaseStyleUrl());
  const style = (await res.json()) as StyleSpecification;
  return applyBrandPalette(style);
}
