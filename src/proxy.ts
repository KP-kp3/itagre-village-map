import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16ではMiddlewareはProxyという名称になっている（役割は同じ）
export function proxy(request: NextRequest) {
  return updateSession(request);
}

// favicon.ico・icons/・logo/だけでなく、icon.png/apple-icon.png(Next.jsのアイコン規約ファイル)や
// api/配下(ジオコーディング等、認証不要なAPI Route)も除外する。これらは元々セッション更新が不要な上、
// ログイン直後の /auth/callback -> / と同時に発生しがちで、並行して不要なセッション更新処理が
// 走ることでCookieの取り扱いが競合する余地を減らす狙いもある
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|icons/|logo/|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
