import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

// セッションのアクセストークンをリクエストごとに検証・更新する。
// Server Component単体ではCookieの書き込みができないため、この処理をmiddlewareで担う。
export async function updateSession(request: NextRequest) {
  // Supabase未接続の間は地図の閲覧自体は動かしたいので、何もせず素通りさせる
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser()の呼び出しがトークンの検証・自動リフレッシュを行う
  await supabase.auth.getUser();

  return response;
}
