-- ITAGRE Village Map: フェーズ①ログイン仕様変更
-- 0001時点の「ログインでvillagersを自動作成する」仕様から、
-- 「マップに登録」操作でのみvillagersを作る新仕様へ移行する。
-- 0001適用後の状態（新旧どちらでも）に対して安全に再実行できる内容にしてある。

-- 1) 旧仕様で自動作成された空のvillagers行を削除する
--    （dog_name未入力＝まだ「マップに登録」していない状態のものだけを対象。念のためdog_name is nullに限定）
--    ※これらは今回の仕様変更前のテストで自動生成されたプレースホルダ行で、実データではない
delete from public.villagers where dog_name is null;

-- 2) owner_name列を廃止
alter table public.villagers drop column if exists owner_name;

-- 3) dog_nameを必須化（「マップに登録」時に必ず入力されるため）
alter table public.villagers alter column dog_name set not null;

-- 4) bioの文字数制約（100文字以内）を追加
alter table public.villagers add constraint villagers_bio_length check (char_length(bio) <= 100);

-- 5) handle_new_user()を更新：villagersへのinsertをやめ、profilesのみ作成する
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, discord_username, discord_avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'name',
      '村民'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 6) 確認：profilesは残るがvillagersは0件になっているはず
select
  (select count(*) from public.profiles) as profiles_count,
  (select count(*) from public.villagers) as villagers_count;
