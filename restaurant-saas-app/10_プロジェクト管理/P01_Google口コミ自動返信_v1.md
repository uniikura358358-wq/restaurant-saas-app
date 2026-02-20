# P01_Google口コミ自動返信_v1.md

## 概要

Google Business Profile (GBP) の口コミを自動取得し、{{SERVICE_NAME}} のトーンに合わせた最適な返信を生成・送信するモジュール。

## ロジック・ワークフロー

1. **データ取得**: Google My Business API (googleapis) を使用し、対象店舗の非返信口コミを取得。
2. **プロンプト生成**:
   - 前提: {{OWNER_ROLE}} として返信する。
   - コンテキスト: 店舗設定（{{STORE_NAME}}, {{STORE_AREA}}, {{AI_TONE}}）を付与。
   - 制限: 文字数制限、絵文字レベル、署名を含める。
3. **AI生成**: Google Gemini API (`gemini-2.5-flash`) を使用。
4. **保存・送信**:
   - 送信前に Firebase Firestore (`reviews` コレクション) にステータス `unreplied` で保存。
   - 承認/自動送信後、ステータスを `replied` に更新。

## 手動設定手順 (Admin Console)

1. **Google Cloud Console**:
   - `My Business Business Information API` / `My Business Account Management API` の有効化。
   - OAuth 2.0 クライアント ID / サービスアカウントの作成。
2. **Firebase Console**:
   - `reviews`, `stores` コレクションのインデックス作成。

## 環境変数・依存項目

- `GOOGLE_API_KEY`: Gemini API 用。
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firestore 操作用。
- Package: `googleapis`, `@google/generative-ai`, `firebase-admin` (v13.6.1)

## Next Step

Google My Business API の Webhook 連携（即時通知・自動返答トリガー）の実装。
