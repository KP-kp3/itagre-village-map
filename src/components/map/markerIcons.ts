export const residentIconConfig = {
  url: "/icons/resident-pin.svg",
  width: 38,
  height: 42,
  variant: "resident" as const,
};

export const spotIconConfig = {
  url: "/icons/spot-pin.svg",
  width: 38,
  height: 42,
  variant: "spot" as const,
};

type IconConfig = typeof residentIconConfig | typeof spotIconConfig;

/**
 * MapLibreはMarkerに渡した要素(outer)のtransformを自前で位置決めに使うため、
 * ここでtransformを操作すると位置がズレる。ホバー/選択のアニメーション用に
 * 内側の要素(inner, `.marker-pin`)を別に持たせ、そちらだけをCSSで動かす。
 * あとから独自デザインへ差し替える際は public/icons/ 配下のSVGを置き換えるだけでよい
 */
export function createMarkerElement(config: IconConfig) {
  const outer = document.createElement("div");

  const inner = document.createElement("div");
  inner.className = `marker-pin marker-pin--${config.variant} marker-enter`;
  // 登場アニメーション終了後はanimationをクラスごと外す。CSSアニメーションは
  // 対象プロパティ(transform)についてhover/selected等の通常ルールより優先されてしまうため、
  // 外さないままだとホバー/選択時の見た目が反映されなくなる。
  inner.addEventListener(
    "animationend",
    () => inner.classList.remove("marker-enter"),
    { once: true }
  );

  const img = document.createElement("img");
  img.src = config.url;
  img.width = config.width;
  img.height = config.height;
  img.draggable = false;
  img.style.display = "block";
  img.style.pointerEvents = "none";

  inner.appendChild(img);
  outer.appendChild(inner);

  return { outer, inner };
}
