import { createClient } from "@/lib/supabase/client";
import { validateImageFile } from "@/lib/validateImageFile";

// 変更後の画像のみアップロードする（初期値のDiscordアイコンはこの関数を通らない）。
// ファイル名にタイムスタンプを含めることで、同じ村民が再度変更した際にCDN側の
// キャッシュが古い画像のまま残ることを避ける。
export async function uploadVillagerPhoto(
  userId: string,
  file: File,
): Promise<string> {
  // 選択時にも検証しているが、呼び出し元を問わず安全なようここでも確認する
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("villager-photos")
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;

  const { data } = supabase.storage.from("villager-photos").getPublicUrl(path);
  return data.publicUrl;
}
