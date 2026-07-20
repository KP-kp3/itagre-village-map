-- ITAGRE Village Map: 初期スキーマ（認証・権限まわり）

-- =========================================================
-- profiles: auth.users を1:1で拡張し、役割(role)を持たせる
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  discord_username text not null,
  discord_avatar_url text,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- auth.uid()の役割判定用ヘルパー。security definerでRLSを介さずprofilesを参照することで、
-- profiles自体のRLSポリシーの中で使っても無限再帰にならないようにする。
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- 村民一覧・オーナー名表示のため、プロフィールは誰でも閲覧可能
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- 自分の行のみ更新可能。ただしroleは自分では変更できない（管理者のみ変更可）
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (
    (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()))
    or public.is_admin()
  );

-- 新規ユーザーのprofiles行はトリガーのみが作成する（アプリ側からのinsertは不可）
create policy "profiles_no_direct_insert"
  on public.profiles for insert
  with check (false);

-- =========================================================
-- villagers: 村民プロフィール＋任意のピン
--
-- 重要: これは「居住地」ピンではない。ログインしただけでは作られず、
-- 「マップに登録」操作で初めて1行作られる（1ユーザー1件、user_idにunique制約）。
-- 登録時点ではdog_name（名前）・bio（紹介文）・photo_url（プロフィール画像）のみ入力し、
-- place_name/prefecture/lat/lngはnullのまま＝地図には表示されない。
-- 後から任意の「ピンを設置する」操作でplace_name/prefecture/lat/lngを埋めて
-- 初めて地図に表示される。owner_name（オーナー名）は廃止した。
-- =========================================================
create table public.villagers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  dog_name text not null, -- 「マップに登録」で必須入力する名前
  place_name text, -- 「調布駅」「野川公園」等、ピンを設置した場所の名前（住所ではない）。ピン未設置ならnull
  prefecture text, -- 一覧の絞り込み・表示用（ピンのある都道府県）。ピン未設置ならnull
  bio text check (char_length(bio) <= 100), -- 紹介文。100文字以内
  lat double precision, -- ピン未設置の間はnull
  lng double precision, -- ピン未設置の間はnull
  photo_url text, -- 初期値はDiscordアバター。登録時に変更可
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.villagers enable row level security;

create policy "villagers_select_all"
  on public.villagers for select
  using (true);

create policy "villagers_insert_own"
  on public.villagers for insert
  with check (auth.uid() = user_id);

create policy "villagers_update_own_or_admin"
  on public.villagers for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "villagers_delete_own_or_admin"
  on public.villagers for delete
  using (auth.uid() = user_id or public.is_admin());

-- =========================================================
-- spots: おすすめスポット
--
-- villagersとは独立したテーブルで、1人が何件でも登録できる（user_idにunique制約なし）。
-- categoryは将来のイベント・ショップ等の追加を見据えた列。現時点で使うのは'spot'のみで、
-- 新しい種類を追加する際はcheck制約に値を足すだけでよい構造にしてある。
-- MVPではUI（一覧・登録画面・フィルター）にcategoryを一切出さない。
-- =========================================================
create table public.spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'spot' check (category in ('spot', 'event', 'shop')),
  name text not null,
  prefecture text not null,
  description text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spots enable row level security;

create policy "spots_select_all"
  on public.spots for select
  using (true);

create policy "spots_insert_own"
  on public.spots for insert
  with check (auth.uid() = user_id);

create policy "spots_update_own_or_admin"
  on public.spots for update
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "spots_delete_own_or_admin"
  on public.spots for delete
  using (auth.uid() = user_id or public.is_admin());

-- =========================================================
-- 新規ユーザー作成時のトリガー
-- Discordログインでauth.usersへ行が作られたら、対応するprofilesだけを自動生成する。
-- villagersはここでは作らない（「マップに登録」操作で村民自身が作る）。
-- 再ログイン時はauth.usersへの再insertが発生しないため、このトリガーは
-- 初回ログイン時にしか実行されず、重複登録は起きない。on conflictは念のための保険。
-- =========================================================
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
