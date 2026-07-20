import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Discord OAuthからのリダイレクト先。認可コードをセッションに交換する。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("auth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/`);
}
