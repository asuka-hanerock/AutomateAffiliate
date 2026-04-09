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

（現時点でタスクなし）

---

## 技術構成

```
AutomateAffiliate/
├── backend/
│   ├── src/
│   │   ├── index.ts                     # Express (PORT=3002)
│   │   ├── routes/
│   │   │   ├── accounts.ts              # CRUD
│   │   │   ├── run.ts                   # POST /api/run（手動トリガー、preview/confirm対応）
│   │   │   ├── logs.ts                  # ログ取得・削除
│   │   │   ├── delete-tweets.ts         # X投稿削除
│   │   │   ├── sync-profile.ts          # Xプロフィール同期
│   │   │   ├── prompts.ts              # プロンプトCRUD
│   │   │   ├── formats.ts              # 流行構文テンプレートCRUD
│   │   │   └── analyze-format.ts       # スクショ→構文分析（Claude画像入力）
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
│   │       ├── AccountForm.tsx           # プロフィール編集（profileBio含む）
│   │       ├── AccountDetail.tsx          # 詳細+プレビューモーダル
│   │       ├── AccountSettings.tsx        # 投稿設定（スケジュール/CTA/文字数上限）
│   │       ├── AccountApiKeys.tsx         # API連携
│   │       ├── PromptManager.tsx
│   │       └── FormatManager.tsx          # 流行構文テンプレート管理+スクショ分析
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
