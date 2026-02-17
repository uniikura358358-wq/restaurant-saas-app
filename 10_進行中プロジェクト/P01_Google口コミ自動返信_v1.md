# P01_Google口コミ自動返信_v1.md

## 1. 概要

Google Business Profile (GBP) の口コミを自動取得し、Gemini AIを用いて独自のトーンで返信を生成・管理する。オーナーの工数削減とMEO対策を目的とする。

## 2. 実装詳細（Logic & Safety）

### A. AI生成・プラン管理

- **料金体系**: Light(¥3,980), Standard(¥9,800), Premium(¥12,800)。
- **プロンプト構造**: `review-reply-generator.ts` にて、「飲食店オーナー」としてのロールを固定。
- **安全弁 (Hardcoded Safety)**: 星2以下の低評価レビューに対しては、設定に関わらず強制的に「手動承認（下書き）」モードへ振り分け、AI生成文から絵文字とノイズを自動除去する。

### B. 返信実行ロジック (`submit-reply/route.ts`)

- **トランザクション**: Firestore トランザクションを使用し、`reviews` の状態更新、`replies` の作成、および統計情報 (`stats/current`) の更新をアトミックに実行。
- **冪等性**: `X-Request-ID` による重複送信防止。
- **外部API**: GBP API への投稿は DB 更新成功後に実行（Best Effort）。

### C. Gemini 連携

- `gemini-3-flash-preview` を優先利用し、クォータ超過時やエラー時は `gemini-2.5-flash` へフォールバック。

## 3. DB構造 (Firestore)

- **`reviews/{reviewId}`**: `status` ("unreplied" | "replied"), `userId`, `rating`, `replyId` を保持。
- **`replies/{reviewId}`**: 返信本文、生成種別（"ai" | "manual"）を保持。
- **`users/{uid}/stats/current`**: `unrepliedCount`, `averageRating` 等をリアルタイム集計。

## 4. 環境変数

- `GOOGLE_API_KEY`: Gemini / GBP API 認証。
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Admin SDK 権限。

## Next Step

Google Business Profile API の審査通過に向けた、Human-in-the-loop（人間による承認）フローのデモ動画作成とドキュメント整備。
