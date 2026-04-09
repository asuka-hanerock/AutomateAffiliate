# AutomateAffiliate 引き継ぎ資料

## 現在の状態

### 完成済み（動作確認済）
- X自動スレッド投稿パイプライン（トレンド取得→話題選定→スレッド生成→X投稿→ログ保存）
- 管理画面（アカウントCRUD、投稿ログ、プロンプト管理、スケジュール設定）
- 公式X SDK（@xdevplatform/xdk）でのスレッド投稿・削除
- Google News RSS + BigQuery Googleトレンドの2ソース話題取得
- Googleスプレッドシート連携（投稿ログ記録）
- AES-256-GCM暗号化（全APIキー）
- Xプロフィール同期（アイコン・名前・@ユーザー名自動取得）
- プロンプト管理（話題選定/スレッド生成、スケジュール：常時/曜日/日数おき/ローテーション）
- 投稿スケジュール（曜日+時刻UIで複数設定可能）
- テスト実行（X投稿スキップ、スプレッドシートのみ記録）
- 投稿ログ：絞り込み、検索、一括削除、X投稿削除
- X風ツイートカードUI
- 140文字バリデーション（最大3回リトライ）
- 使用済み話題の重複防止（プロセスメモリ、直近30件）

### 対象アカウント
- @kamefuku10000（かめふく🐢）
- ジャンル: 転職
- 一人称: 私、トレードマーク: 🐢

---

## 次にやること（優先順）

### 1. 投稿前プレビュー+承認フロー（最優先）
**背景**: 「今すぐ実行」を押すと即投稿されるが、内容を確認してから投稿したい

**実装方針**:
- `POST /api/run` に `preview: true` オプション追加
- preview=trueの場合: トレンド取得→話題選定→スレッド生成まで実行し、生成結果をレスポンスで返す（X投稿しない、DBにも保存しない）
- フロントエンド: プレビューモーダルでスレッド内容を表示
- 「投稿する」ボタンで `POST /api/run` を `confirm: true` + 生成済みpostsで呼ぶ
- アカウント設定に `skipPreview: Boolean @default(false)` を追加
- skipPreview=trueの場合は従来通り即投稿

**変更ファイル**:
- `backend/src/services/pipeline.ts` — preview/confirmモード追加
- `backend/src/routes/run.ts` — preview/confirmパラメータ対応
- `backend/src/prisma/schema.prisma` — Account.skipPreview追加
- `frontend/src/pages/AccountDetail.tsx` — プレビューモーダルUI

### 2. 流行構文テンプレート
**背景**: Xで流行っている投稿構文（「〇〇な人の特徴」「〇〇、知らないとやばい」等）を登録して、スレッド生成時に使わせたい

**実装方針**:
- 新モデル `TrendFormat`（accountId, name, template, example, isActive）
- template例: `「{{topic}}な人の特徴」→ 特徴を5つ挙げるスレッド`
- スレッド生成プロンプトに `{{trendFormat}}` 変数を追加
- pipeline.tsで有効なTrendFormatからランダム or ローテーションで1つ選んで注入
- 管理画面にTrendFormat CRUD UI

**変更ファイル**:
- `backend/src/prisma/schema.prisma` — TrendFormatモデル追加
- `backend/src/routes/formats.ts` — 新規CRUD API
- `backend/src/services/pipeline.ts` — フォーマット選択ロジック
- `backend/prompts/generate-thread.txt` — {{trendFormat}}変数追加
- `frontend/src/pages/FormatManager.tsx` — 新規管理画面

### 3. プロンプト改善（かめふくアカウント向け）
**背景**: 投稿内容が一般論的で差別化できていない

**改善ポイント**:
- 発信者プロフィールをプロンプトに注入: 大手IT企業エンジニア・副業でアプリ/SaaS複数運営・ITストラテジスト/AWS DVA取得
- 一人称視点を強化（「現場で感じるのは〜」「自分がエンジニアとして〜」）
- ターゲット明示: 転職・年収アップを考えている20〜30代エンジニア
- Account に `profileBio`（発信者プロフィール文）フィールドを追加し、プロンプトに `{{profileBio}}` で注入するのが良い

**変更ファイル**:
- `backend/prompts/generate-thread.txt` — 全面書き直し
- `backend/prompts/select-topic.txt` — 現場エンジニア目線に調整
- `backend/src/prisma/schema.prisma` — Account.profileBio追加
- `backend/src/services/claude.ts` — profileBio変数追加

### 4. usedTopics永続化
**背景**: backendリスタートで使用済み話題リストがリセットされる

**実装方針**:
- pipeline.ts起動時にPostLogから直近30件のtopicを読み込む
- プロセスメモリのusedTopicsをPostLog読み込みで初期化

**変更ファイル**:
- `backend/src/services/pipeline.ts` — initUsedTopics関数追加

### 5. 確認スキップ設定
**背景**: cronの自動実行時はプレビュー不要なので、自動実行時は即投稿で良い

**実装方針**:
- cron.tsからの実行はpreviewなし（従来通り）
- 管理画面の「今すぐ実行」はpreviewあり（デフォルト）
- skipPreview=trueならpreviewなしで即投稿

---

## 技術構成

```
AutomateAffiliate/
├── backend/
│   ├── src/
│   │   ├── index.ts                     # Express (PORT=3002)
│   │   ├── routes/
│   │   │   ├── accounts.ts              # CRUD
│   │   │   ├── run.ts                   # POST /api/run（手動トリガー）
│   │   │   ├── logs.ts                  # ログ取得・削除
│   │   │   ├── delete-tweets.ts         # X投稿削除
│   │   │   ├── sync-profile.ts          # Xプロフィール同期
│   │   │   └── prompts.ts              # プロンプトCRUD
│   │   ├── services/
│   │   │   ├── trends.ts                # BigQuery + Google News RSS
│   │   │   ├── claude.ts                # 話題選定 + スレッド生成
│   │   │   ├── twitter.ts               # X投稿（公式SDK）
│   │   │   ├── twitter-delete.ts        # X投稿削除
│   │   │   ├── sheets.ts               # スプレッドシート書き込み
│   │   │   ├── pipeline.ts              # 全体パイプライン
│   │   │   └── prompt-selector.ts       # プロンプト選択ロジック
│   │   ├── scheduler/cron.ts            # node-cron（複数ジョブ対応）
│   │   ├── utils/
│   │   │   ├── crypto.ts                # AES-256-GCM
│   │   │   └── db.ts                    # Prisma client
│   │   └── prisma/schema.prisma
│   └── prompts/
│       ├── select-topic.txt             # デフォルト話題選定プロンプト
│       └── generate-thread.txt          # デフォルトスレッド生成プロンプト
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   └── ScheduleEditor.tsx       # 曜日+時刻スケジュールUI
│   │   └── pages/
│   │       ├── AccountList.tsx
│   │       ├── AccountForm.tsx
│   │       ├── AccountDetail.tsx
│   │       └── PromptManager.tsx
│   └── vite.config.ts                   # proxy → localhost:3002
```

## 起動方法

```bash
# ターミナル1
cd backend && npm run dev    # PORT=3002

# ターミナル2
cd frontend && npm run dev   # PORT=5173
```

## 環境変数（backend/.env）

```
DATABASE_URL=file:./dev.db
ENCRYPTION_KEY=（64文字hex）
PORT=3002
```

他の設定（X APIキー、Claude APIキー、Google連携）は全て管理画面から登録。

## DBモデル

- **User**: email
- **Account**: displayName, profileImageUrl, xUsername, bio, niche, pronoun, trademark, cronSchedule(JSON), ctaEnabled, X APIキー×4(暗号化), claudeApiKey(暗号化), googleServiceAccountJson(暗号化), googleSpreadsheetUrl
- **PostLog**: topic, content(JSON), tweetIds, status, postedAt
- **PromptTemplate**: name, type(topic_select/thread_generate), content, scheduleType, scheduleConfig(JSON), isActive, sortOrder

## リポジトリ

https://github.com/asuka-hanerock/AutomateAffiliate
