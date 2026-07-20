-- ITAGRE Village Map: プロフィール画像用のSupabase Storageバケット
--
-- 方針: 初期値はDiscordアバターのURLをvillagers.photo_urlにそのまま保存する
-- （アップロード不要）。村民が画像を変更した場合のみ、このバケットへ
-- アップロードし、生成された公開URLをvillagers.photo_urlに保存する。
-- ファイルパスは "{user_id}/{ファイル名}" とし、本人のフォルダにしか
-- 書き込めないようRLSで制限する。

insert into storage.buckets (id, name, public)
values ('villager-photos', 'villager-photos', true)
on conflict (id) do nothing;

-- 誰でも閲覧可能（村民ピン・PopupCardで表示するため）
create policy "villager_photos_select_all"
  on storage.objects for select
  using (bucket_id = 'villager-photos');

-- 本人のフォルダ（先頭パスセグメント = auth.uid()）にのみアップロード可能
create policy "villager_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'villager-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 本人のフォルダ内のファイルのみ上書き・削除可能
create policy "villager_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'villager-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "villager_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'villager-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
