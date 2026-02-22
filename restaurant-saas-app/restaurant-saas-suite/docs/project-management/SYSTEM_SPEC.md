# システム構成定義書 (SYSTEM_SPEC)

このドキュメントは、**2026年2月20日時点** の最新システム構成（Firebase 統合済み）を正確に記述したものです。

## 1. 基盤アーキテクチャ

- **Framework**: [Next.js](https://nextjs.org/) (App Router 構成)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS + [Shadcn UI](https://ui.shadcn.com/)
- **Deployment**: Vercel (推奨)

## 2. バックエンド & データベース (Firebase 統合)

全機能を Firebase プロジェクト **`restaurant-saas-2026`** に一本化しました。

- **Authentication**: [Firebase Auth](https://firebase.google.com/docs/auth)
  - ユーザー認証、ログイン状態の管理。
- **Database**: [Cloud Firestore](https://firebase.google.com/docs/firestore)
  - `adminDb` (Server Side) を経由してアクセス。
  - 用途: ユーザープロファイル、店舗情報、口コミデータ、AI利用状況、決済状態。
- **Storage**: [Firebase Storage](https://firebase.google.com/docs/storage)
  - 用途: POPテンプレート画像、ユーザーアップロード画像。
- **AI Backend**: Vertex AI Studio (Gemini)

## 3. AI モデル運用規則（恒久固定）

コストとパフォーマンスの最適化のため、以下のモデル構成を厳守します。

1. **メイン：`gemini-3-flash-preview`**
   - 思考レベル（Thinking Level）：**`LOW`**
   - 用途：AI返信生成、POPコピー作成、画像解析。
2. **サブ：`gemini-2.5-flash`**
   - 用途：異常発生時のフォールバック。

## 4. 外部サービス連携

- **決済**: [Stripe](https://stripe.com/)
- **販売/認証管理**: [Whop](https://whop.com/)
- **デザイン**: [Canva](https://www.canva.com/) (Connect API)

## 5. 環境変数管理 (.env.local)

`restaurant-saas-2026` への完全一本化により、環境変数も整理されています。

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID="restaurant-saas-2026"`
- `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON文字列、Git管理対象外)

## 6. 運用・開発プロトコル（重要）

タスク完了後は以下のフローを徹底してください。

1. **タスクの実装完了 & 動作確認**
2. **ログ・日報への記録 (Mandatory)**
    - `90_ログ・日報/Task_Tracker.md` の更新
    - `90_ログ・日報/YYYY-MM-DD_日報.md` の作成（変更点・修正ファイルの記録）
3. **Dashboard / Pricing の同期**
    - 大きな進捗や価格改定時は関連する Markdown ファイルをすべて同期・更新する。

---
*Updated: 2026-02-20 | Firebase Unification & AI Model Fixation.*
