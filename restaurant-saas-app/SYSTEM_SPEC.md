# システム構成定義書 (SYSTEM_SPEC)

このドキュメントは、**2026年2月17日時点** のシステム構成（Firebase/Supabase ハイブリッド構成）を正確に記述したものです。

> [!WARNING]
> 現在のシステムは過渡期にあり、Firebase と Supabase が混在しています。開発や改修の際は、各機能がどちらのバックエンドに依存しているかを確認する必要があります。

## 1. 基盤アーキテクチャ

- **Framework**: [Next.js](https://nextjs.org/) (App Router 構成)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS + [Shadcn UI](https://ui.shadcn.com/)
- **Deployment**: Vercel (想定)

## 2. バックエンド & データベース (Hybrid)

現在、機能ごとに使用するバックエンドが分かれています。

### A. Firebase (Legacy / AI)

主に **AI機能** と **クライアントサイドの認証状態管理** に使用されています。

- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
  - `src/hooks/useAuth.ts` でログイン状態を監視。
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore)
  - `adminDb` (Server Side) を経由してアクセス。
  - 用途: AI生成ログ、AI利用回数（クォータ）管理
- **Functions**: AI返信生成 API (`/api/generate-reply`) は Firebase Admin SDK を使用。

### B. Supabase (New / Dashboard)

主に **ダッシュボードのデータ表示** と **本データの保存** に使用されています。

- **Database**: PostgreSQL
  - テーブル: `reviews` (口コミデータ)
- **Data Access**: supabase-js client & server actions
  - 用途: ダッシュボードへの口コミ一覧表示、返信内容の保存 (`/api/reviews/submit-reply`)

## 3. 外部 API 連携 & AI 機能

- **AI モデル**: [Google Gemini API](https://ai.google.dev/gemini-api/docs)
  - モデル: `gemini-3-flash-preview` / `gemini-2.5-flash`
- **決済**: Stripe (実装中)

## 4. コンポーネント依存関係マップ

| 機能 | 依存バックエンド | 関連ファイル |
| :--- | :--- | :--- |
| **ログイン画面** | Firebase Auth | `src/app/login/page.tsx`, `useAuth.ts` |
| **口コミ一覧表示** | **Supabase DB** | `src/app/dashboard/page.tsx` |
| **AI返信生成** | **Firebase** (Auth/Firestore) | `src/components/ReviewReplyButton.tsx`, `api/generate-reply` |
| **返信保存** | **Supabase** (Auth/DB) | `api/reviews/submit-reply` |

## 5. 必要な環境変数 (.env.local)

ハイブリッド構成のため、両方の認証情報が必要です。

### Firebase

- `NEXT_PUBLIC_FIREBASE_API_KEY` 等のクライアント設定
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (Admin用)

### Supabase

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (もし使用する場合)

### AI & Others

- `GOOGLE_API_KEY` (Gemini)
- `STRIPE_SECRET_KEY`

## 6. 運用・開発プロトコル（重要）

タスク完了後の記録漏れを防ぐため、以下のフローを徹底してください。

1. **タスクの実装完了**
2. **動作確認**
3. **ログ・日報への記録 (Mandatory)**
    - `90_ログ・日報/Task_Tracker.md` のチェックボックスを更新
    - `90_ログ・日報/YYYY-MM-DD_日報.md` を作成または更新し、変更点・修正ファイルを記録
4. **全体計画の更新 (Optional)**
    - 大きな進捗があった場合は `00_経営・戦略/Dashboard.md` の計画表を更新

---
This document represents the *actual* running configuration as of Feb 17, 2026.
