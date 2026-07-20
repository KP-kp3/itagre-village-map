-- ITAGRE Village Map: 本番公開前チェック用の診断SQL
-- Supabase SQL Editorで実行し、結果を共有してください（このファイル自体はDBに変更を加えません）

-- =========================================================
-- 1. テーブル・カラムの存在確認（0001〜0003が適用済みか）
-- =========================================================
select table_name, column_name, is_nullable, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'villagers', 'spots')
order by table_name, ordinal_position;

-- 期待値の要点:
--   villagers: dog_name が not null / owner_name列が存在しない
--              place_name, prefecture, lat, lng, bio, photo_url は nullable
--   spots:     category, name, prefecture, lat, lng が not null
--              description は nullable

-- =========================================================
-- 2. Storageバケットの存在確認
-- =========================================================
select id, name, public
from storage.buckets
where id = 'villager-photos';

-- =========================================================
-- 3. RLS有効化の確認（全テーブルでtrueになっているか）
-- =========================================================
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('profiles', 'villagers', 'spots');

-- =========================================================
-- 4. RLSポリシー一覧の確認
-- =========================================================
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 期待値の要点:
--   各テーブルに select(全公開) / insert・update・delete(本人 or is_admin()) のポリシーが揃っていること

-- =========================================================
-- 5. Storageオブジェクトのポリシー確認
-- =========================================================
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'villager_photos%';

-- =========================================================
-- 6. トリガー・関数の存在確認
-- =========================================================
select tgname, tgrelid::regclass as table_name
from pg_trigger
where tgname = 'on_auth_user_created';

select proname
from pg_proc
where proname in ('handle_new_user', 'is_admin');

-- =========================================================
-- 7. 実データの件数確認（動作確認・整合性の参考値）
-- =========================================================
select
  (select count(*) from public.profiles) as profiles_count,
  (select count(*) from public.villagers) as villagers_count,
  (select count(*) from public.villagers where lat is not null) as villagers_with_pin_count,
  (select count(*) from public.spots) as spots_count;
