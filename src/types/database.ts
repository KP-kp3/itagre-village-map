// supabase/migrations/0001_init.sql の内容と対応する手書きの型。
// 実際にSupabaseプロジェクトへマイグレーションを適用した後は、
// `supabase gen types typescript --project-id <ref> > src/types/database.ts`
// の出力へ置き換えること。

export type Profile = {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  role: "member" | "admin";
  created_at: string;
  updated_at: string;
};

// 居住地ピンではない。ログインだけでは作られず、「マップに登録」操作で
// dog_name(名前・必須)/bio(紹介文)/photo_url(初期値はDiscordアバター)を入力して1人1件作られる
// （user_idにunique制約あり）。owner_nameは廃止済み。
// place_name/prefecture/lat/lngは「ピンを設置する」操作（任意）で後から埋めるまでnull。
export type Villager = {
  id: string;
  user_id: string;
  dog_name: string;
  place_name: string | null;
  prefecture: string | null;
  bio: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SpotCategory = "spot" | "event" | "shop";

// villagersとは独立。1人が複数登録できる。categoryは将来の拡張用（現状は'spot'のみ使用）
export type Spot = {
  id: string;
  user_id: string;
  category: SpotCategory;
  name: string;
  prefecture: string;
  description: string | null;
  lat: number;
  lng: number;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "discord_username">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      villagers: {
        Row: Villager;
        // 「マップに登録」操作でアプリから直接insertする（ログイン時のトリガーでは作らない）
        Insert: Partial<Villager> & Pick<Villager, "user_id" | "dog_name">;
        Update: Partial<Villager>;
        Relationships: [];
      };
      spots: {
        Row: Spot;
        Insert: Partial<Spot> & Pick<Spot, "user_id" | "name" | "prefecture" | "lat" | "lng">;
        Update: Partial<Spot>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
