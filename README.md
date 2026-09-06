# AIニュース

AIが国内外の様々なニュースソース(英語ソース・個人ブログを含む)を自動収集し、AIが
ファクトチェックに合格した記事だけを日本語で表示するニュースサイトです。

- **探索**: 普段あまり読まないジャンルの記事を意図的に表示。👍/👎で反応するとおすすめに反映
- **おすすめ**: クリック履歴と探索での「気に入った」をもとにパーソナライズ
- **国内ニュース / 国内政治 / 国際ニュース / 国際政治 / IT / エンタメ**: 固定カテゴリタブ(10件/ページ)
- **気象予報**: 気象庁(JMA)公式データをリアルタイム表示
- **ラジオ**(オプション): AIが台本を書き、VOICEVOXで読み上げる音声ニュース(1日1回更新)
- ログイン(メール/パスワード + Google)でユーザーごとの好みを保存
- ダークモード対応・新聞ポータル風デザイン

## 技術スタック

- Next.js 16(App Router / TypeScript)+ Tailwind CSS v4 + shadcn/ui(base-nova, @base-ui/react)
- Supabase(Postgres + Auth + Storage、`@supabase/ssr`、Row Level Security)
- Google Gemini API(`@google/genai`。翻訳・要約・カテゴリ分類・ファクトチェック。
  サーバー側Google Search Grounding併用。**無料枠のみで運用可能**)
  - GPU搭載PCがあれば、Ollama + Qwen3によるローカルLLMでの完全無料運用も選択可能(後述)
- GitHub Actions による1日6回(4時間おき)のGemini収集(Vercel Cronは使用しない)
  + ローカルOllamaを併用する場合、Windowsタスクスケジューラで1日8回(3時間おき)
    追加収集することで、無料枠内で日々の記事数を最大化できる(後述)
- 気象庁(JMA)公式JSON API(APIキー不要)
- VOICEVOX(ローカル、オプション)によるAIラジオ音声合成

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [supabase.com](https://supabase.com) で新規プロジェクトを作成
2. プロジェクト設定 > API から `Project URL` / `anon public key` / `service_role key` を取得
3. SQL Editor で `supabase/migrations/` 内のファイルを **番号順に** 実行
   (または Supabase CLI で `supabase db push`)
4. Authentication > Providers で **Email** と **Google** を有効化
   - Googleを有効化するには、先に手順3(Google Cloud Console)が必要
5. Authentication > URL Configuration で
   - Site URL: 本番のVercelドメイン(例: `https://your-app.vercel.app`)
   - Redirect URLs: `http://localhost:3000/**` と本番ドメインの `**` を追加

### 3. Google OAuthクライアントの作成

1. [Google Cloud Console](https://console.cloud.google.com/) でOAuth 2.0クライアントID(ウェブアプリケーション)を作成
2. 承認済みのリダイレクトURIに以下を追加:
   ```
   https://<あなたのSupabaseプロジェクトref>.supabase.co/auth/v1/callback
   ```
3. 発行されたClient ID / Client SecretをSupabaseの Authentication > Providers > Google に貼り付け

### 4. Gemini APIキーの発行

[aistudio.google.com](https://aistudio.google.com/apikey) で「Get API key」からAPIキーを発行してください。
**クレジットカード登録は不要**で、無料枠のみで利用開始できます。

### 5. 環境変数の設定

`.env.local.example` を `.env.local` にコピーし、上記で取得した値を設定してください。

```bash
cp .env.local.example .env.local
```

### 6. ニュースソースの初期登録

`.env.local` 設定後、初期ソース一覧(`src/config/sources.ts`)をSupabaseに登録します。

```bash
npm run seed:sources
```

個人ブログ等、追加したいソースがあれば `src/config/sources.ts` に追記して再実行してください
(RSS/Atomフィード形式のURLが必要です)。

### 7. ローカル起動

```bash
npm run dev
```

http://localhost:3000 を開いてください。

### 8. 収集パイプラインの手動テスト

記事はVercel Cronから `/api/cron/ingest` が定期的に叩かれることで収集されます。
ローカルで動作確認する場合:

```bash
curl -H "Authorization: Bearer <.env.localのCRON_SECRET>" http://localhost:3000/api/cron/ingest
```

`ingestion_runs` テーブルと `articles` テーブルに結果が記録されます。
ファクトチェックに合格(`fact_check_status = 'pass'`)した記事のみが各タブに表示されます。

### 9. Vercelへのデプロイ

1. GitHubリポジトリを作成し、このプロジェクトをpush
2. [vercel.com](https://vercel.com) でプロジェクトを作成しリポジトリを接続
3. 環境変数を設定(`.env.local` と同じ項目一式。`NEXT_PUBLIC_*` はクライアントにも公開されます)。
   **`MAX_ARTICLES_PER_RUN` は `5` を推奨**(実機検証の結果、10件だとVercelのサーバーレス
   関数のタイムアウト(60秒)に達することを確認済み)
4. デプロイ後、SupabaseのAuth URL ConfigurationのSite URL/Redirect URLsを本番ドメインに更新
5. 環境変数はデプロイ後に追加すると反映に再デプロイが必要な場合があります
   (Vercelダッシュボードの Deployments > 最新デプロイの「...」> Redeploy)

### 10. 定期収集の設定(1日6回・GitHub Actions)

**Vercel Hobbyプラン(無料)のCronは1日1回までの制限があるため**、`vercel.json`によるVercel Cronは
使わず、**GitHub Actionsで1日6回・4時間おき(JST 0/4/8/12/16/20時)** `/api/cron/ingest` を呼び出す
構成にしています(追加費用なし)。ページ送り等ユーザー操作をきっかけにAI収集が走ることは
一切なく、収集はこの定時実行のみに限定されています([.github/workflows/ingest.yml](.github/workflows/ingest.yml))。
1回あたりの処理件数はVercelのサーバーレス関数タイムアウト対策で`MAX_ARTICLES_PER_RUN=5`に
抑えているため、その分実行頻度を上げて日次の収集数を確保しています。

設定手順:
1. GitHubリポジトリの **Settings > Secrets and variables > Actions** を開く
2. 以下のRepository secretsを追加:
   - `SITE_URL`: デプロイ済みのサイトURL(例: `https://your-app.vercel.app`)
   - `CRON_SECRET`: `.env.local`/Vercelの環境変数と同じ値
3. これで4時間おきに自動実行されます。GitHub の Actions タブから手動実行(workflow_dispatch)も可能です

スケジュールを変更したい場合は `.github/workflows/ingest.yml` の `cron` 式(UTC基準)を編集してください。

ローカルPCでOllamaを常時使える環境がある場合は、後述の「ローカルLLM(Ollama)で完全無料運用する」の
Windowsタスクスケジューラ設定と併用することで、Gemini側は控えめな頻度のままローカル側で
記事数を大きく増やせます(無料枠を消費するのはGemini呼び出しのみのため)。

## ディレクトリ構成

```
src/
  app/                     # Next.js App Router のページ・ルート
    explore/ recommended/ domestic/ domestic-politics/
    international-politics/ it/ weather/ article/[id]/
    login/ settings/ auth/ api/
  components/
    layout/                # ヘッダー・タブナビ・テーマ切替
    article/                # 記事カード・いいね/よくないねボタン
    weather/                # 気象予報UI
    ui/                     # shadcn/ui プリミティブ
  lib/
    supabase/               # client/server/admin/middleware ヘルパー
    ai/                     # Gemini連携(ファクトチェック・翻訳パイプライン)
    ingestion/               # RSS取得・本文抽出・重複排除
    recommendation/          # おすすめ・探索のスコアリング
    weather/                 # JMA連携
  config/
    sources.ts               # 収集元RSSフィードの初期シード
    jma-areas.ts              # 気象庁エリアコード一覧
supabase/migrations/          # SQLマイグレーション(番号順に適用)
scripts/seed-sources.ts       # sources.ts → Supabase への投入スクリプト
```

## 設計上のポイント

- **ファクトチェック**: 収集した全記事はAI(Gemini + Google Search Grounding)による判定を経て
  `pending / pass / fail / needs_review` のいずれかになります。**`pass` の記事のみが
  Row Level Security で一般公開**され、それ以外は構造的にユーザーへ表示されません
  (`articles` テーブルの `fact_check_status = 'pass'` ポリシー)。
- **著作権への配慮**: 元記事の全文は保存・表示せず、AIによる要約のみを表示し、
  「元記事を読む」リンクで出典元へ誘導します。
- **おすすめ/探索のスコアリング**: `src/lib/recommendation/score.ts` にNode側で実装。
  ベクトルDB無しのMVP構成(カテゴリ親和度 + キーワード一致 + 新しさ + 多様性)。
  将来的にpgvector + 埋め込みモデルへ拡張可能な設計にしています。
- **未ログインでも閲覧可能**: 全タブは未ログインでも閲覧できますが、👍/👎やパーソナライズには
  ログインが必要です(未ログイン時はログイン画面へ誘導)。

## 無料で運用するには

ホスティング・DB・AIともに、想定利用規模(1日10記事程度の収集)であれば**実質無料**で
運用できるように構成しています。

| 項目 | 内容 | 無料である理由 |
|---|---|---|
| Vercelホスティング | Hobbyプラン | 個人利用の範囲なら無料枠内 |
| Supabase | Freeプラン | 500MB DB・認証込みで無料。**ただし1週間アクセスが無いと自動一時停止**するため、低頻度アクセスの個人サイトの場合は時々アクセスするか、Supabase側の設定でpingを検討してください |
| 気象庁API | 無料・APIキー不要 | 公式公開API |
| AIモデル | `gemini-3.5-flash-lite`(既定) | Google AI Studioの無料枠(クレジットカード不要)で実際に動作確認済み |
| ファクトチェックのWeb検索 | 既定でOFF(`ENABLE_WEB_SEARCH_FACTCHECK=false`) | **実機検証の結果、Google Search Groundingは無料枠のみのアカウントだと429エラーになり、Google Cloud側の課金設定(Billing有効化)が必要と判明**。クレジットカード登録なしで運用する場合はOFFのままにしてください(その場合、本文の内部矛盾・妥当性のみで判定する簡易ファクトチェックになります) |
| 収集頻度 | 1日6回・4時間おき(GitHub Actions、JST 0/4/8/12/16/20時) | Vercel Hobbyのcron制限(1日1回)を回避しつつ追加費用なし。ページ送り等による追加収集は行わない |
| 1回の収集件数 | Vercelでは`MAX_ARTICLES_PER_RUN=5`を推奨 | サーバーレス関数の実行時間上限(60秒)に収めるため。実機検証で10件だとタイムアウトすることを確認済み |

無料枠を使い切る主なリスクは「記事数を大幅に増やす」「Cronを非常に高頻度にする」場合です。
その場合は [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)
で最新の無料枠条件を確認してください(無料枠のデータはGoogleのモデル改善に利用される場合が
あります。ニュース記事という公開情報が対象なので機密性は低い想定ですが、念のため記載します)。

**Web検索ありのファクトチェックを使いたい場合**: Google Cloud Consoleで対象プロジェクトの
Billing(課金設定)を有効化すれば `ENABLE_WEB_SEARCH_FACTCHECK=true` が動作する見込みです
(未検証。カード登録は必要になりますが、想定利用量なら無料枠内に収まる可能性は高いです)。

**さらに精度を上げたい場合**: `.env.local` の `GEMINI_MODEL` を `gemini-3.5-flash` 等の
上位モデルに変更できますが、無料枠の対象外になる可能性があるため使用量画面で確認してください。

## ローカルLLM(Ollama)で完全無料運用する(オプション)

GPU搭載PC(目安: VRAM 12GB以上)があれば、Gemini APIすら使わず**完全にオフラインのローカルLLM**
で記事収集を行うこともできます。RTX 3060 12GBクラスで実機動作確認済みです。

### 仕組み

サイト本体(閲覧・ログイン・気象予報)はこれまで通りVercelにホスティングしたままにし、
**記事収集(AI処理)だけ**をあなたのPC上のスクリプトに切り出します。Vercel(クラウド)から
ローカルPC上のOllamaを直接呼び出すことはできない(自宅PCをインターネットに公開しない限り)ため、
この収集スクリプトは手動実行、またはWindowsタスクスケジューラ等で「PCが起動している時だけ」
定期実行する運用になります。書き込み先のSupabaseは共通なので、サイト側の閲覧には影響ありません。

### セットアップ

1. [Ollama](https://ollama.com/download) をインストール
2. モデルを取得(日本語を含む多言語性能が高いQwen3を推奨):
   ```bash
   ollama pull qwen3:8b
   ```
   (VRAMに余裕があれば `qwen3:14b` などより大きいモデルも可)
3. `.env.local` に以下を追加(Gemini関連の設定は不要になります):
   ```
   OLLAMA_MODEL=qwen3:8b
   OLLAMA_HOST=http://127.0.0.1:11434
   ```
4. Ollamaが起動していることを確認(`ollama serve`、またはインストール後は常駐アプリとして自動起動)
5. 収集を実行:
   ```bash
   npm run ingest:local
   ```

### 自動実行(Windowsタスクスケジューラ)

PCが起動している間、定期的に自動収集させたい場合は [scripts/run-local-ingest.ps1](scripts/run-local-ingest.ps1)
をタスクスケジューラに登録します(Ollama未起動時は自動起動を試みたうえで収集を実行し、
結果を `logs/` にUTF-8で記録します)。

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\ritou\Documents\ai-news-site\scripts\run-local-ingest.ps1"'
$trigger = New-ScheduledTaskTrigger -Once -At "00:30" -RepetitionInterval (New-TimeSpan -Hours 3) -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "AINewsSiteLocalIngest" -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "AI News Site: local Ollama ingestion, every 3 hours."
```

これで3時間おき(GitHub Actions/Geminiの4時間おきスケジュールとはずらしてあります)にPCが
起動している間だけ自動収集されます。確認・削除は以下の通りです:
```powershell
Get-ScheduledTask -TaskName "AINewsSiteLocalIngest"       # 状態確認
Get-ScheduledTaskInfo -TaskName "AINewsSiteLocalIngest"   # 前回実行結果・次回実行時刻
Unregister-ScheduledTask -TaskName "AINewsSiteLocalIngest" -Confirm:$false  # 削除
```

### Gemini版との違い

- **完全無料・レート制限無し**(電気代のみ)
- **web検索によるファクトチェックはできません**(ローカルモデルには検索ツールが無いため、常に
  本文の内部整合性のみで判定する簡易ファクトチェックになります。`src/lib/ai/pipeline-ollama.ts`)
- PCが起動していない間は新しい記事が増えません(サイトの閲覧自体はVercel側なのでいつでも可能)
- 実装は `src/lib/ai/pipeline-ollama.ts` + `scripts/ingest-local.ts`。収集ループ本体
  (`src/lib/ingestion/runIngestion.ts`)はGemini版と共有しているため、プロバイダ間で
  ファクトチェック方針以外のロジックは統一されています

## 記事の「詳しく」ボタン(AIによる深掘り解説)

記事詳細ページの要約の下に「詳しく」ボタンがあります。押すとAIが要約より踏み込んだ解説
(背景・経緯・今後の見通しなど、500〜800字程度)を生成して表示します。

- 一度生成した解説は `articles.detailed_explanation` にキャッシュされ、以後は同じ記事に
  対して再度AIを呼び出しません(クリックの度に課金・処理が走ることはありません)。
- **事前生成でなるべくOllamaを使う設計**になっています: ローカルOllama収集
  (`npm run ingest:local` / `scripts/run-local-ingest.ps1`)は、記事を1件収集する度に
  この深掘り解説も**その場でOllamaを使って生成し、DBに保存**します
  (`scripts/ingest-local.ts` の `onArticleInserted` フック)。そのため、ローカル収集で
  取り込まれた記事は、ユーザーが本番サイトで「詳しく」を押した時点で**既にOllama生成済みの
  解説がキャッシュに入っており、即座に表示されるだけ**(AI呼び出し無し)になります。
  Gemini(`src/lib/ai/pipeline.ts` の `generateDeepDiveGemini`)は、GitHub Actions側の
  Gemini収集で取り込まれた記事、または何らかの理由でまだ生成されていない記事に対する
  オンデマンドのフォールバックとしてのみ使われます(本番Vercelからはローカル
  PCのOllamaに直接到達できないため、フォールバック時は必ずGeminiになります)。
- 実装: `src/lib/ingestion/runIngestion.ts` の `onArticleInserted`(事前生成)、
  `src/app/api/articles/[id]/deep-dive/route.ts`(オンデマンド生成・キャッシュ)、
  `src/components/article/deep-dive-section.tsx`(ボタンUI)。

**マイグレーション**: この機能を使うには `supabase/migrations/0011_add_detailed_explanation.sql`
の適用が必要です(未適用でもサイト自体は問題なく動作し、「詳しく」ボタンがエラー表示になるだけです)。

## AIラジオ機能(オプション)

その日収集したニュースをもとに、AIが台本を書き、音声合成で読み上げる音声番組です。
タブではなく、ヘッダー右上のラジオアイコンのボタン(📻)から `/radio` ページを開く形になって
います(`src/components/layout/header.tsx`)。台本生成はローカルLLM(Ollama)、音声合成は
[VOICEVOX](https://voicevox.hiroshiba.jp/)(無料の日本語音声合成ソフト)を使うため、
**追加費用なし**で運用できます。

- **更新頻度**: 1日3回(6時/12時/18時ごろ)。ニュース収集の元々のリズムに合わせています。
- **台本の冒頭**: 「(年)年(月)月(日)日(時)時のニュースです。」という読み上げから必ず始まります
  (AIに書かせるのではなく `src/lib/radio/generateScript.ts` の `buildOpeningLine` で確実に
  組み立てて先頭に付加しているため、時刻表記のブレはありません)。
- **重要な注意点**: 台本は世間の反応(SNS等)に触れることがありますが、これは**AIによる推測・
  一般論**であり、実際の投稿を引用しているわけではありません(同ファイルのプロンプトで、
  断定的な言い回しを避け「〜という声もありそうです」といった推測表現を使うよう指示しています)。

### セットアップ

1. [VOICEVOX](https://voicevox.hiroshiba.jp/) をインストール(`winget install HiroshibaKazuyuki.VOICEVOX` でも可)
2. VOICEVOXを起動しておく(通常のGUIアプリ起動でエンジンも一緒に立ち上がります。
   ヘッドレスで動かしたい場合は `vv-engine\run.exe` を直接実行)
3. Ollamaも起動しておく(ローカルLLM収集機能と共用。「ローカルLLMで完全無料運用する」参照)
4. 生成を実行:
   ```bash
   npm run radio:generate
   ```
   直近8時間(既定、`RADIO_HOURS_LOOKBACK`)の合格記事から台本を作成し、音声合成後に
   Supabase Storageへアップロード、`radio_episodes` テーブルに登録します
   (所要時間は記事数・PC性能に依存、数十秒〜数分程度)。

### 1日3回の自動実行(Windowsタスクスケジューラ)

ニュース収集(GitHub Actions)と異なり、ラジオ生成はローカルのVOICEVOX/Ollamaに依存するため
**あなたのPC上でのみ実行できます**。[scripts/run-radio-generate.ps1](scripts/run-radio-generate.ps1)
をタスクスケジューラに登録することで、6時/12時/18時に自動実行できます
(Ollamaは未起動なら自動起動を試みます。VOICEVOXはインストール場所が環境依存のため
自動起動はせず、起動していなければその回の生成をスキップしてログに記録するだけです。
普段からVOICEVOXを常駐させておくことを推奨します)。

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -ExecutionPolicy Bypass -File "C:\Users\ritou\Documents\ai-news-site\scripts\run-radio-generate.ps1"'
$triggers = @(
    New-ScheduledTaskTrigger -Daily -At "06:00"
    New-ScheduledTaskTrigger -Daily -At "12:00"
    New-ScheduledTaskTrigger -Daily -At "18:00"
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "AINewsSiteRadio" -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description "AI News Site: radio generation, 6:00/12:00/18:00 daily."
```

確認・削除:
```powershell
Get-ScheduledTaskInfo -TaskName "AINewsSiteRadio"   # 前回実行結果・次回実行時刻
Unregister-ScheduledTask -TaskName "AINewsSiteRadio" -Confirm:$false  # 削除
```

### カスタマイズ

- `VOICEVOX_SPEAKER`: 話者ID(既定は2 = 四国めたん ノーマル)。起動中のVOICEVOXで
  `http://127.0.0.1:50021/speakers` を開くと一覧を確認できます
- `RADIO_HOURS_LOOKBACK`(既定8時間) / `RADIO_MAX_ARTICLES`: 台本に使う記事の対象期間・件数。
  1日3回更新なので、24時間のままだと3回とも似た内容になりやすい点に注意してください

## 外部サーバーで常時稼働させる(オプション、PC不要化)

ここまでのローカルLLM運用(記事収集・ラジオ生成)は、あなたのWindows PCが起動していて
Ollama/VOICEVOXが動いている時にしか実行されません。PCの電源が入っていない間は収集が
止まってしまうため、**24時間起動しっぱなしの外部サーバーに移す**ことで、PCに依存せず
常に最新の状態を保てるようにできます。サイト本体(Vercel)・DB(Supabase)はこれまで通りで、
変わるのはOllama/VOICEVOXの実行場所だけです。

### サーバーの選び方

**おすすめ: [Oracle Cloud Infrastructure(OCI)の Always Free 枠](https://www.oracle.com/cloud/free/)**
の Ampere A1(ARM)インスタンス。期間限定のトライアルではなく、**無料枠のまま永続的に**
使えるのが最大のメリットです。

- 2026年6月の仕様変更後は **2 OCPU / 12GB RAM**(以前は4 OCPU/24GB)。qwen3:8b(Q4量子化、
  常駐時約5〜6GB)+ VOICEVOX + Node.js を動かすには十分な余裕があります(CPU推論のため
  1記事あたりの処理速度はRTX 3060での実績より遅くなりますが、3時間おきの実行間隔には
  収まる見込みです)
- ARM(arm64)ですが、Ollama・VOICEVOX ENGINEともにLinux arm64版が公式に提供されており
  問題なく動作します
- インスタンス作成時に「Out of host capacity」で弾かれることがありますが、**東京・大阪
  リージョンは比較的空きが見つかりやすい**と報告されています(米国リージョンほど混雑しない)
- サインアップにクレジットカードの登録が必要ですが、無料枠の範囲内であれば課金は発生しません

このアプリは**受信ポートを一切公開する必要がありません**(Supabaseへ発信するだけの
ワーカーのため)。管理用のSSH以外は外部に開放しないでください。

もしOracleの無料枠が確保できない、または管理の手間を減らしたい場合は、
[Hetzner](https://www.hetzner.com/cloud/) 等の格安VPS(月数百〜千円程度、x86なので
VOICEVOXも確実に動作)を契約する方法もあります(この場合は無料運用ではなくなる点にご注意ください)。

### セットアップ手順(Ubuntu 22.04/24.04を想定)

1. **サーバー作成**: OCIコンソールで Compute > Instances > Create Instance。Shapeで
   「Ampere」→ VM.Standard.A1.Flex を選択し、OCPU/メモリを無料枠の上限(2 OCPU/12GB)に
   設定。イメージはUbuntu。作成後、SSH鍵でログインできることを確認してください
2. **基本パッケージ**:
   ```bash
   sudo apt update && sudo apt install -y curl git p7zip-full build-essential
   ```
3. **Node.js(LTS)**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
4. **Ollama**(公式インストールスクリプトが systemd サービスとして自動登録・自動起動します):
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ollama pull qwen3:8b
   systemctl status ollama   # active (running) になっていることを確認
   ```
5. **VOICEVOX ENGINE**([Releases](https://github.com/VOICEVOX/voicevox_engine/releases/latest)
   のLinux CPU arm64版。`gh` CLI([インストール手順](https://cli.github.com/))を使うと
   分割ファイルもまとめてダウンロードできます):
   ```bash
   mkdir -p ~/voicevox_engine && cd ~/voicevox_engine
   gh release download --repo VOICEVOX/voicevox_engine \
     --pattern "voicevox_engine-linux-cpu-arm64-*.7z.*"
   7z x voicevox_engine-linux-cpu-arm64-*.7z.001
   chmod +x run
   ```
   systemdサービス化(`/etc/systemd/system/voicevox.service`。ホストは`127.0.0.1`に
   バインドし、外部に公開しないこと):
   ```ini
   [Unit]
   Description=VOICEVOX Engine
   After=network.target

   [Service]
   Type=simple
   ExecStart=/home/ubuntu/voicevox_engine/run --host 127.0.0.1 --port 50021
   WorkingDirectory=/home/ubuntu/voicevox_engine
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl enable --now voicevox
   systemctl status voicevox   # active (running) になっていることを確認
   ```
6. **リポジトリの取得と依存関係**:
   ```bash
   git clone https://github.com/<あなたのGitHubユーザー名>/ai-news-site.git
   cd ai-news-site
   npm install
   chmod +x scripts/*.sh
   ```
7. **`.env.local` を作成**(`.env.local.example` を参考に、`NEXT_PUBLIC_SUPABASE_URL` /
   `SUPABASE_SERVICE_ROLE_KEY` / `OLLAMA_MODEL` / `VOICEVOX_HOST=http://127.0.0.1:50021`
   等を設定。**このファイルには強い権限のservice_roleキーが入るため、`chmod 600 .env.local`
   でファイル権限を絞ってください**)
8. **動作確認**(実際に1回ずつ手動実行):
   ```bash
   npm run ingest:local
   npm run radio:generate
   ```
9. **cron登録**(`crontab -e`):
   ```cron
   # 記事収集: 3時間おき
   0 */3 * * * /home/ubuntu/ai-news-site/scripts/run-local-ingest.sh
   # ラジオ生成: 6時/12時/18時
   0 6,12,18 * * * /home/ubuntu/ai-news-site/scripts/run-radio-generate.sh
   ```

### 移行後にやること

- Windows PC側で登録した `AINewsSiteLocalIngest` / `AINewsSiteRadio` タスクは、外部サーバーで
  正常に動作していることを確認できたら停止・削除してください(残しておくと二重に処理が走り、
  電力・PCリソースの無駄になります。DB側は記事のURL重複排除があるため、記事が重複登録される
  実害はありません)。
  ```powershell
  Unregister-ScheduledTask -TaskName "AINewsSiteLocalIngest" -Confirm:$false
  Unregister-ScheduledTask -TaskName "AINewsSiteRadio" -Confirm:$false
  ```
- サーバーのOS・パッケージのセキュリティアップデートは自動化しておくことを推奨します
  (`sudo apt install unattended-upgrades`)
- SSHはパスワード認証を無効化し、鍵認証のみにしてください
  (`/etc/ssh/sshd_config` の `PasswordAuthentication no`)

## セキュリティ

実施済みの対策:

- **Row Level Security(RLS)**: 全テーブルで有効化。`articles`は`fact_check_status = 'pass'`の
  行のみ一般公開、`sources`/`ingestion_runs`はservice-role専用、`profiles`/`user_article_interactions`
  は本人の行のみ読み書き可、`radio_episodes`と`radio-audio`ストレージは読み取りのみ公開
- **service_role キー**: サーバー専用コード(`lib/supabase/admin.ts`、cronルート、ローカルスクリプト)
  でのみ使用し、クライアントに一切渡さない
- **セキュリティヘッダー**: `X-Frame-Options`(クリックジャッキング対策)、`X-Content-Type-Options`、
  `Referrer-Policy`、`Permissions-Policy`を全ページに付与([next.config.ts](next.config.ts))
- **`/api/cron/ingest`の保護**: `CRON_SECRET`(強固なランダム値)によるBearer認証。実機で
  誤ったシークレットが401で拒否されることを確認済み。**フェイルクローズ設計**: `CRON_SECRET`が
  万一未設定の場合でも(以前は誤って誰でも叩ける状態になっていたが)必ず401を返すよう修正済み
- **`/api/articles/[id]/deep-dive`のレート制限**: 未ログインでも叩ける公開APIのため、
  Ollamaが使えない環境でのGeminiフォールバック呼び出しに1日あたりの上限(既定50回、
  `DEEP_DIVE_GEMINI_DAILY_LIMIT`)を設け、`deep_dive_gemini_calls` テーブルで記録・判定する。
  上限超過時は423ではなく429を返し、無料枠を連打・大量記事IDアクセスで消費し尽くされることを防ぐ
  (キャッシュ済み記事の再取得や、到達可能な場合のOllama呼び出し自体はこの上限に含まれない)
- **依存パッケージ**: `npm audit` で脆弱性0件を確認済み(定期的な再実行を推奨)
- **XSS対策**: `dangerouslySetInnerHTML`等の危険なパターンは未使用。記事本文はAI要約のみ表示
  (元記事全文は保存するがUIには出さない)
- **ラジオ音声のストレージ容量対策**: 1日3回・数MB/回の音声ファイルが無制限に蓄積すると
  Supabaseの無料ストレージ枠を圧迫するため、`scripts/generate-radio.ts` が生成のたびに
  既定14日(`RADIO_RETENTION_DAYS`)より古いエピソードの音声ファイル・DB行を自動削除する

**運用上ご確認いただきたい点**:
- Supabaseの Authentication > Providers > Email で「Confirm email」を有効にすることを推奨します
  (無効のままだと、他人のメールアドレスを名乗って登録できてしまいます。開発中は利便性のため
  無効化を提案しましたが、本番運用では有効化してください)
- `CRON_SECRET`・APIキー類は定期的なローテーションを推奨します

## 今後の拡張候補(未実装)

- pgvector + 埋め込みモデルによる類似度ベースのレコメンド精度向上
- 収集ソース管理画面(現状は `src/config/sources.ts` の編集 + シードスクリプト)
- 通知・メールダイジェスト
- 記事の言語別フィルタ・全文検索
