-- ITAGRE Village Map: 村民プロフィールにInstagramリンク・誕生日を追加
-- どちらも任意項目（登録・編集フォームで必須にしない）

alter table public.villagers
  add column instagram_url text, -- Instagramプロフィールへのリンク（任意）
  add column birthday date; -- 誕生日（任意）
