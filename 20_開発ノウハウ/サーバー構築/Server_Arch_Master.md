# Server_Arch_Master.md

## 1. 概要

Next.js 16 (App Router) と Firebase (Admin SDK / Client SDK) を中心とした、高可用性・保守性を重視したサーバー構成テンプレート。

## 2. 基本アーキテクチャ

- **Frontend**: Next.js App Router (Turbopack 有効化)。
- **Backend (Serverless)**: Next.js API Routes + Firebase Admin SDK。
- **Database**: Cloud Firestore (Native モード)。
- **Auth**: Firebase Auth (Identity Platform)。

## 3. 実裝プロトコル (Safety Rules)

- **環境変数チェック**: `src/lib/check-env.ts` により、起動時に必須キーが欠損している場合はプロセスを安全に停止。
- **Admin SDK 初期化**: `firebase-admin.ts` にて `try-catch` を用い、ビルド時のダミー環境変数によるクラッシュを防止し安全なゲッターを提供。
- **動的レンダリング**: API ルートは原則 `export const dynamic = 'force-dynamic'` および `export const revalidate = 0` を付与し、ビルドエラーを回避。

## 4. フォルダ構造のベストプラクティス

- `/src/lib/`: Firebase, Stripe 等の共通設定・ユーティリティ。
- `/src/app/api/`: ビジネスロジック。認証 (`verifyAuth`) 必須。
- `/src/hooks/`: `useAuth`, `useQuota` 等のクライアントサイド状態管理。

## 5. 推奨パッケージ

- `firebase-admin`
- `stripe`
- `zod` (環境変数/リクエスト検証)

## 次に実装すべき最小単位のタスク

GitHub Actions を用いた、CI/CD パイプライン（Lint/Build/Test）の構築。
