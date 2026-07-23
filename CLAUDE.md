@AGENTS.md

# ITAGRE Village Map

オンラインコミュニティ「ITAGRE Village」の公式マップ。イタグレオーナーが「お気に入りの場所・よく行く駅・ドッグラン・散歩コース・カフェ」などを共有するコミュニティマップ。
**居住地マップではない**。自宅住所の登録を前提にした設計はしないこと。

## 現在のフェーズ

設計フェーズは終了し、MVP実装中。2026-07-20に大きな仕様変更を反映（本ドキュメントが最新の正）。
**既存の実装やドキュメント記述が本セクション以降の内容と矛盾する場合、常にこのCLAUDE.mdの記述を優先すること。**

## MVPスコープ（確定仕様）

### 村民登録は2段階に分かれる

1. **Discordログイン** → `profiles`のみ自動作成。`villagers`は作られない
2. **「マップに登録」**（ログイン済み＆`villagers`未作成の場合のみボタン表示）→ 名前・紹介文・プロフィール画像（Discordアイコンが初期値、変更可）を入力して`villagers`行を作成。この時点では位置情報は登録しない＝地図には表示されない
3. **「ピンを設置する」**（マップ登録済みの場合のみ表示、任意）→ 場所名（例:「調布駅」「野川公園」「◯◯ドッグラン」）と座標を登録して初めて地図にピンが表示される

村民ピンに`owner_name`（オーナー名）・住所的な位置情報は持たせない。表示するのは「プロフィール画像・名前・紹介文・場所名」の4つ（`prefecture`は村民ピンには表示しない。スポットのみ`prefecture`を保持・表示する）。

地図に表示する村民ピン・スポットはどちらも全件が実データ（`lat`/`lng`が設定済みの`villagers`全件、`spots`全件）。本番公開に向けてサンプルのダミーデータ（`src/data/residents.ts`・`src/data/spots.ts`）は削除済み。

### 機能一覧

- 地図表示（MapLibre GL JS + MapTiler、ブランドカラーで配色）
- Discordログイン/ログアウト、ログイン状態保持
- マップ登録（村民プロフィール作成・編集：名前必須、紹介文100字以内、プロフィール画像）
- ピン設置（場所名・座標。任意、マップ登録後にいつでも実施可）
- おすすめスポットの登録・表示（スポット名・説明・位置。登録者は自動取得。`category`はDB上は残すがUIには一切出さない）
- 村民ピン・スポットピンの地図表示、クリックでPopupCard表示
- 一覧表示（画面右下「一覧」ボタン→🐾村民／📍スポットのタブ、クリックで地図移動＋ピン選択＋Popup表示）
- 検索（村民名・スポット名のリアルタイム検索）
- 都道府県フィルター
- 地図上の場所検索（住所・地名を入力して地図をその場所へジャンプさせる。村民ピン・スポット登録とは無関係の、地図ナビゲーション専用機能）

## デザイン方針

- ITAGRE Villageらしい上品でナチュラルな「ぬくもりイラスト風」デザインを維持する
- PC・スマホ対応（レスポンシブ）
- **ピンは村民とスポットで形そのものを変え、色だけでなく形でも判別できるようにする**
  - 村民ピン：ブランドデザイン（ネームタグ形状）、ティール
  - スポットピン：一般的なマップピン（涙型）、セージグリーン

## 技術スタック

| 分類 | 選定 |
|---|---|
| フレームワーク | Next.js (App Router, TypeScript) |
| ホスティング | Vercel |
| DB/認証/ストレージ | Supabase（無料枠、Row Level Securityで自分の投稿のみ編集可能に制限） |
| DBアクセス | `@supabase/supabase-js` / `@supabase/ssr` を直接使用（ORM無し） |
| 地図 | `maplibre-gl`（ベクタータイル、Reactラッパー無しの薄い自作コンポーネント） |
| 地図タイル | MapTiler（`NEXT_PUBLIC_MAPTILER_API_KEY`未設定時は登録不要のOpenFreeMapにフォールバック。`src/lib/mapBrandStyle.ts`で切り替え） |
| スタイリング | Tailwind CSS |

無料開始・Vercelデプロイ・将来の機能拡張しやすさを条件に選定。

**地図座標の注意**: データ（`src/data/`）は`[lat, lng]`で保持し、MapLibreに渡す直前（`VillageMap.tsx`内）で`[lng, lat]`に変換する。MapLibreは経度が先という点で他ライブラリと順序が逆なので要注意。

### 地図スタイル方針（「3. ぬくもりイラスト風」案で確定・実装済み）

`src/lib/mapBrandStyle.ts`の`applyBrandPalette()`が、取得したスタイルJSON（OpenFreeMap/MapTilerどちらもOpenMapTilesスキーマ）のレイヤーを
以下の配色に上書きする。村民ピン（ティール）・スポットピン（セージ）が地図上で唯一の高彩度要素になるよう、地図側は低彩度に保っている。
MapTilerのAPIキー設定後も同じ関数がそのまま使われる。

| 要素 | 色 |
|---|---|
| 陸地 | `#F6EEE0` |
| 水域 | `#AEC4C4`（ピンのティールより彩度・明度を落とし、別の色相に寄せて同化を避ける） |
| 公園・緑地 | `#C9D3B0` |
| 主要道路 | `#E8B99A` |
| 細街路 | `#F0DDC4` |
| 建物 | `#EAD9C2` |
| ラベル文字 | `#6B5940` |

参考: Airbnbのカスタムマップスタイル、Apple Mapsの温かみのある建物表現。

**ランドマーク(POI)ラベル**：MapTilerのベーススタイルは`streets-v2`を使う（`getBaseStyleUrl()`）。`basic-v2`には駅名以外の一般的な施設・店舗名レイヤーが含まれていないため、ズームすると地図上にランドマーク名が出るようにこちらへ変更した。ただしPOIのカラフルなアイコン画像（買い物・飲食等のカテゴリアイコン）は「村民ピン・スポットピンだけが高彩度」というブランド方針と合わないため、`applyBrandPalette()`内で`source-layer === "poi"`のレイヤーから`icon-image`を取り除き、ブランド色の文字ラベルのみ残している。

**ラベルの日本語表記**：`streets-v2`の国・都市・都道府県・河川・海洋等のラベルレイヤーは`text-field`が`name:en`（英語名）優先の式になっており、そのままだと「Tokyo」「TOCHIGI PREFECTURE」のように英語表記になる。`applyBrandPalette()`内の`preferJapaneseLabel()`が、`name:en`を参照する`text-field`を`["coalesce", ["get","name:ja"], ["get","name"], ["get","name:en"]]`（日本語タグ→現地名→英語名の順）に置き換えている。

### 地図上の場所検索・現在地移動

地名・住所から座標へのジオコーディングは`src/app/api/geocode/route.ts`（サーバー側API Route）が担う。優先順位はGoogle Places API(施設名・ランドマーク、最も精度が高いが有料、月10,000件まで無料) > Yahoo!ローカルサーチ(施設名・ランドマーク) > Yahoo!ジオコーダ(住所) > MapTiler Geocoding > Nominatim(OpenStreetMap、キー不要の最終フォールバック)。各サービスは得意分野が異なるため、該当なしの場合は次のサービスへ順に試す設計。YOLP・Google Places APIはいずれもCORS制限・APIキー秘匿の都合でブラウザから直接呼べないためAPI Route経由にしている。`GOOGLE_PLACES_API_KEY`・`YAHOO_CLIENT_ID`はどちらもサーバー専用のシークレット（`NEXT_PUBLIC_`を付けない）。クライアント側の`src/lib/geocode.ts`はこのAPI Routeを叩くだけの薄いラッパー。検索ボックス・「現在地に移動」ボタンのUIは`src/components/map/LocationSearchBox.tsx`に共通化してあり、`onFound(lat, lng)`コールバックで呼び出し側に座標を渡すだけの設計。3箇所で使われている：
- `VillageMap.tsx`（一覧用の地図）：`onFound`で`map.flyTo()`に加え、検索結果地点に仮ピン（MapLibreの標準マーカー、村民/スポットピンとは別の見た目）を1本表示する。村民ピン・スポットピンの実データではない検索結果であることが分かるよう、あえてブランドデザインのピンとは差別化している。次に検索するたびに前回の仮ピンは消して置き換える。ログイン済み（`canRegisterSpot`）の場合のみ、この仮ピンの近くに「この場所をスポット登録」ボタンを表示し、押すと`SpotFormFlow`が`initialPosition`（検索結果の座標）付きで開き、場所選択済みの状態（都道府県も自動入力済み）からスポット名等の入力に進める。ヘッダーの「スポットを登録する」ボタンと同じ`SpotFormFlow`を再利用しており、`initialPosition`は新規登録時のみ使う（`editingSpot`がある場合はそちらが優先）
- `PinPlacementFlow.tsx`・`SpotFormFlow.tsx`（ピン設置・スポット登録の地図）：`onFound`で`setTempPosition()`と`map.flyTo()`の両方を行う。検索結果の場所にそのまま仮ピンを置ける（例：「神代ドッグラン」と検索→その場所に仮ピンが立ち、あとは場所名等を入力して保存するだけ）

いずれも見つかった座標を使うだけで、村民ピン・スポットの登録データ自体とは無関係（ピン設置・スポット登録フローが「住所検索・逆ジオコーディングは使わない」と決めたのは、位置を確定させる手段としての話であり、検索は位置を探す手段として別途提供している）。

**入力中の候補表示（Googleマップ風のサジェスト）**：`LocationSearchBox.tsx`は入力から300msデバウンスして`src/app/api/geocode/suggest/route.ts`を呼び、ドロップダウンで候補を表示する。候補は`structuredFormat`の`mainText`（スポット名、太字）・`secondaryText`（住所、小さくグレー）の2段組みでGoogleマップと同じ見た目にしている。候補選択時は`src/app/api/geocode/place/route.ts`（Place Details）で初めて座標を取得する2段階構成（Google Places Autocompleteのレスポンス自体には座標が含まれないため）。この候補表示はGoogle Places専用の機能で、`GOOGLE_PLACES_API_KEY`未設定の場合は常に候補なし（空配列）になり、Enter/検索ボタンでの確定検索（`route.ts`、Yahoo!以下へのフォールバックあり）のみが使える。

**スポット登録の都道府県自動入力**：`SpotFormFlow.tsx`は地図クリック・検索候補選択のどちらでも、位置が決まるたびに`src/lib/nearestPrefecture.ts`で都道府県プルダウンの値を自動設定する（外部APIは使わない近似）。プルダウン自体は残しているため、境界付近など自動判定がズレた場合は手動で修正できる。

### 認証・DB設計

- **会員制コミュニティのアクセス制限**：ITAGRE VillageはDiscordサーバーメンバー限定のコミュニティのため、退会者が引き続きログインできてしまわないよう、ログイン時にDiscordサーバー（`DISCORD_GUILD_ID`環境変数）の現メンバーかどうかを確認する（`src/app/auth/callback/route.ts`）。Discord OAuthに`guilds`スコープを追加し（`AuthProvider.tsx`の`signInWithDiscord`）、`exchangeCodeForSession()`が返す`provider_token`でDiscordの`/users/@me/guilds`を叩いて判定。メンバーでなければ即`signOut()`して`/?error=not_member`へリダイレクトし、`AccessDeniedNotice.tsx`がその場で通知を表示する。**サーバーを退出した瞬間ではなく、次にログインを試みたタイミングでのブロックになる**（Botによるリアルタイム監視は行わない、ログイン時チェックのみのシンプルな方式）。Discord API呼び出し自体が失敗した場合はブロックしない（fail-open。誤って正規メンバーを締め出さないことを優先）。`DISCORD_GUILD_ID`未設定の場合はこのチェック自体を行わない
- テーブル：`profiles`（auth.usersを1:1拡張、role: member/admin）、`villagers`（村民プロフィール＋任意のピン）、`spots`（おすすめスポット）。定義は`supabase/migrations/`配下
- **Discordログイン時は`profiles`のみ自動作成する。`villagers`はログインでは作らない**（`handle_new_user()`はprofilesのみ担当）
- `villagers`は「マップに登録」操作で初めて作られる（`dog_name`→名前、`bio`→紹介文100字以内、`photo_url`→初期値はDiscordアバター、変更可）。この時点では`place_name`/`prefecture`/`lat`/`lng`はnullのまま＝地図には表示されない
- 「ピンを設置する」操作で`place_name`/`lat`/`lng`のみを更新して初めて地図に表示される。任意操作であり必須ではない。**`prefecture`はこの操作では収集・更新しない**（住所を保存しない方針のため。都道府県フィルターは将来的に別の方法で対応する）
- ピン設置のUIフロー：ヘッダーのピン用ボタン→全画面マップ表示（上部に「地図をクリックしてお気に入りの場所を選んでください」）→地図クリックで仮ピン表示→場所名入力（ボトムシート）→確認画面（保存/戻る）→保存。住所検索・逆ジオコーディング等は行わない、地図クリック＋場所名入力のみの単純なUI。保存するまでDB更新はしない。既にピンがある場合は同じ画面が編集モードになり（既存ピンを表示した状態で開始、場所名は初期値として入力済み）、削除もこの画面から行える。削除してもマップ登録（`villagers`行）自体は解除されない
- `VillageMap`はマウント時にマーカーを一度作るだけでなく、`residents`/`spots`propsの変化に追従してマーカーを増減・更新する（`src/components/map/VillageMap.tsx`）
- `villagers`は1ユーザー1件（`user_id`にunique制約）。`owner_name`列・住所前提のカラムは持たない
- `dog_name`（名前）に**unique制約は付けない**。重複を許容する
- **プロフィール画像の扱い**：登録フォームを開いた時点の初期値はDiscordアバターURL。村民が画像を変更しない限りアップロードは発生せず、`photo_url`にはDiscordのURL（`cdn.discordapp.com`）がそのまま保存される。画像を変更した場合のみSupabase Storageバケット`villager-photos`（`supabase/migrations/0003_villager_photos_storage.sql`、パスは`{user_id}/{ファイル名}`、本人フォルダにのみ書き込み可・閲覧は公開）へアップロードし、生成された公開URLを`photo_url`に保存する。DBが持つのは常にURL文字列のみ
- `spots`は`villagers`と独立したテーブルで、1人が複数登録できる（unique制約なし）。登録者(`user_id`)は自動取得。`category`列（既定値`'spot'`、check制約で`'spot'|'event'|'shop'`）を持たせているが、**MVPではUIに一切出さない**（一覧・登録画面・フィルターとも「おすすめスポット」のみ。event/shop用UIは将来それらを追加する時に初めて実装する）
- スポット登録の確定仕様（フェーズ5開始前に確認済み）：承認フローなし（insertした瞬間から公開）、登録は`villagers`行（マップ登録）の有無を問わずDiscordログイン済みなら誰でも可、1人あたりの登録件数は無制限。`prefecture`は`not null`のため、逆ジオコーディングを使わず`src/data/prefectures.ts`の47都道府県から手動選択させる（ピン設置フローと同じく地図クリック＋簡単な入力のみの単純なUI方針を踏襲）。フェーズ5では登録・表示のみ実装し、編集・削除UIは未実装（DB側のRLSポリシーは既に用意済み）
- スポットは登録された全件を実データとして地図に表示する（`src/components/home/HomeScreen.tsx`が`spots`テーブルを全件fetch）。村民ピンも同様に`lat`/`lng`が設定済みの全件を実データ表示する
- RLS：全テーブルSELECTは公開。INSERT/UPDATE/DELETEはログイン必須＋`auth.uid() = user_id`（自分の投稿のみ）。`is_admin()`関数がtrueを返す場合は全件編集可
- `profiles`のroleは本人からは変更不可（RLSのwith checkで防止）。adminへの昇格は現時点ではSupabase側で直接SQL実行する運用（アプリ内に昇格UIはまだ無い）
- Next.js側：`src/proxy.ts`（Next.js 16でmiddlewareから改名）でセッション更新、`src/app/auth/callback/route.ts`でOAuthコード交換、`src/components/auth/AuthProvider.tsx`でクライアント側のログイン状態を保持し`useAuth()`で参照する
- `src/types/database.ts`は現在手書き。実プロジェクトへマイグレーション適用後は`supabase gen types typescript`の出力に置き換える
- 一覧表示の確定仕様（フェーズ6開始前に確認済み）：画面右下「一覧」ボタン→1つのパネル内で🐾村民／📍スポットをタブ切替（`src/components/list/ListPanel.tsx`）。並び順は新着順（`createdAt`降順）。検索（名前のリアルタイム部分一致）・都道府県フィルターはフェーズ7/8を待たずフェーズ6内で実装済み。村民ピンは`prefecture`を持たない設計のため、フィルターは`src/lib/nearestPrefecture.ts`（47都道府県の県庁所在地との直線距離が最も近いものを都度計算、DBには保存しない・外部API不使用）で都道府県を導出して両タブに適用する。一覧項目クリックで`VillageMap`の`selectedId`連携（パン＋ピン選択＋PopupCard表示）を流用し、パネルは自動的に閉じる
- スポットの「登録者」表示のため、一覧取得時のみ`spots`を`profiles.discord_username`とjoinして取得する（`src/lib/spotToVillageSpot.ts`の`SpotRowWithRegistrant`）。PopupCard自体には登録者を表示しない（一覧のみ）

### 実装フェーズ（この順に進める。1フェーズごとに変更内容・影響範囲・確認方法を報告する）

1. Discordログイン仕様変更（`villagers`自動作成を廃止し`profiles`のみに）— 完了
2. 「マップに登録」導線・登録フォーム（名前・紹介文・画像）— 完了
3. プロフィール編集（登録済み情報の編集）— 完了
4. 「ピンを設置する」導線・場所名/座標の登録— 完了
5. おすすめスポット登録（登録・表示のみ。編集・削除UIは未実装）— 完了
6. 一覧表示（右下「一覧」ボタン、🐾村民／📍スポットタブ）— 完了
7. 検索（村民名・スポット名）— **フェーズ6に統合実装済み。完了扱い**
8. 都道府県フィルター— **フェーズ6に統合実装済み。完了扱い**（村民側は`nearestPrefecture`による近似）

MVPスコープの実装フェーズはこれで一通り完了。以降は運用に向けた仕上げ（スポットの編集・削除UI、村民一覧の全件実データ化、本番デプロイ確認等）を個別に検討する。

## ルール

- ライブラリの追加は、この一覧にないものを使う場合は事前に相談する
- `src/lib/supabase/client.ts`（ブラウザ用）と `src/lib/supabase/server.ts`（サーバー用）を用途に応じて使い分ける
- `src/types/database.ts` はSupabaseのテーブル定義後に `supabase gen types typescript` の出力へ置き換える

## フォルダ構成

```
src/
├── app/                 # ルーティング（Next.js App Router）
├── components/
│   ├── map/             # 地図関連コンポーネント
│   └── ui/              # 汎用UIコンポーネント
├── lib/
│   └── supabase/        # Supabaseクライアント（client.ts / server.ts）
└── types/                # 型定義
public/
└── icons/                # オリジナルSVGアイコン（村民ピン等）
supabase/
└── migrations/           # DBスキーマのマイグレーションSQL
```
