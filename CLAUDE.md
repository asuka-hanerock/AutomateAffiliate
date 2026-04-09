# X自動投稿SaaS (AutomateAffiliate)

## 概要
Xへの自動投稿SaaSのローカル動作版。
Googleトレンド → Claude AI → X投稿 の自動パイプライン。

## 技術スタック
- Backend: Node.js + TypeScript + Express + Prisma (SQLite)
- Frontend: Vite + React + TypeScript
- APIs: twitter-api-v2 (X API), @anthropic-ai/sdk, google-trends-api

## コマンド
- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`
- DB マイグレーション: `cd backend && npx prisma migrate dev`
- DB リセット: `cd backend && npx prisma migrate reset`

## 設計方針
- サービス層は全て `accountId` を受け取るマルチテナント設計
- APIキーはDBに暗号化保存（AES-256-GCM）
- Claude プロンプトは `backend/prompts/` で管理
- エラー時は PostLog に status=failed で記録（リトライなし）
- スレッド投稿は1投稿ごとに3秒delay

## 環境変数
`.env.example` を `.env` にコピーして値を設定する。
APIキーは `.env` に直接書かず、管理画面からDB経由で登録する。
`ENCRYPTION_KEY` のみ `.env` に設定必須。
