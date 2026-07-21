import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 会員制コミュニティのため、ITAGRE VillageのDiscordサーバーの現メンバーかどうかを
// ログインのたびに確認する（退会者が引き続きログインできてしまわないように）。
// サーバーを退出した瞬間ではなく、次にログインを試みたタイミングでのブロックになる点に注意
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

async function isGuildMember(
  providerToken: string,
  guildId: string,
): Promise<boolean> {
  try {
    const res = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    // Discord API側の一時的な不調でログイン不能になるのを避けるため、
    // 確認自体が失敗した場合はブロックしない(fail-open)
    if (!res.ok) return true;
    const guilds = (await res.json()) as { id: string }[];
    return guilds.some((g) => g.id === guildId);
  } catch {
    return true;
  }
}

// Discord OAuthからのリダイレクト先。認可コードをセッションに交換する。
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const providerToken = data.session?.provider_token;
      if (DISCORD_GUILD_ID && providerToken) {
        const member = await isGuildMember(providerToken, DISCORD_GUILD_ID);
        if (!member) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/?error=not_member`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("auth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/`);
}
