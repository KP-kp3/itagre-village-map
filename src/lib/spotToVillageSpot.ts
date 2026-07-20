import type { Spot as SpotRow } from "@/types/database";
import type { Spot } from "@/types/village";

// 一覧表示の「登録者」欄用に、profiles.discord_usernameをjoinして取得したもの
export type SpotRowWithRegistrant = SpotRow & {
  profiles: { discord_username: string } | null;
};

export function spotToVillageSpot(row: SpotRowWithRegistrant): Spot {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    name: row.name,
    prefecture: row.prefecture,
    description: row.description ?? "",
    position: [row.lat, row.lng],
    createdAt: row.created_at,
    registrantName: row.profiles?.discord_username ?? null,
  };
}
