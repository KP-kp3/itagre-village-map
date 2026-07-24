-- ITAGRE Village Map: 登録情報（村民プロフィール・スポット・Discordユーザー名等）の閲覧を
-- ログイン済みユーザー（村民）限定にする。退会者を対象に、次にログインを試みた時点で
-- ブロックする既存の仕組み(src/app/auth/callback/route.ts)の上に乗る制限であり、
-- 既にセッションが確立済みの端末をリアルタイムに締め出すものではない。
-- 未ログインの閲覧者には空の地図（ピンなし）のみ表示される。

drop policy "villagers_select_all" on public.villagers;
create policy "villagers_select_authenticated"
  on public.villagers for select
  using (auth.uid() is not null);

drop policy "spots_select_all" on public.spots;
create policy "spots_select_authenticated"
  on public.spots for select
  using (auth.uid() is not null);

drop policy "profiles_select_all" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  using (auth.uid() is not null);
