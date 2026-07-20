// Supabaseプロジェクト未接続の状態でもアプリ全体（地図の閲覧）が壊れないようにするためのガード。
// 認証関連の処理はこれを見て「未設定なら何もしない」を徹底する。
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
