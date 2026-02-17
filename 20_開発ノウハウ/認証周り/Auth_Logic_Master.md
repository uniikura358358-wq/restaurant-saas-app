# Auth_Logic_Master.md

## 1. 概要

{{AUTH_PROVIDER_NAME}} (Whop) と Firebase Auth を統合し、セキュアな会員制アクセス制御を実現する認証ロジック。

## 2. 認証ワークフロー (OAuth 2.0 + Custom Token)

1. **OAuth認可**: ユーザーが {{AUTH_PROVIDER_LOGIN_URL}} へ遷移し、認可コードを取得。
2. **トークン交換**: サーバーサイド (`api/auth/{{PROVIDER}}/callback`) で認可コードをアクセストークンに交換。
3. **ユーザー情報取得**: プロバイダAPIより email および id を取得。
4. **Firebaseユーザー同期**:
   - `adminAuth.getUserByEmail()` で既存ユーザーを確認。
   - 未登録時は `adminAuth.createUser()` でIDのみ作成（パスワード不要）。
5. **プランステータス同期**: プロバイダの会員プランを検証し、Firestore の `users/{uid}` に `plan` ("light" | "business") と `subscriptionStatus` を保存。
6. **カスタムトークン発行**: `adminAuth.createCustomToken(uid, { plan })` を生成しクライアントへ提供。
7. **サインイン**: クライアント側で `signInWithCustomToken(token)` を実行し、Firebase セッション（Persistence: LOCAL）を確立。

## 3. アクセス制御 (Guard)

- **`verifyAuth`**: すべての API Route で `idToken` を検証し、`uid` を特定する共通関数を必須とする。
- **Middleware/Wrappers**: 有効なプラン（`subscriptionStatus == 'active'`）を保持していないユーザーに対し、ダッシュボードへのアクセスを遮断し、決済ページへ誘導する。

## 4. 必要環境変数

- `NEXT_PUBLIC_WHOP_CLIENT_ID`
- `WHOP_CLIENT_SECRET`
- `WHOP_REDIRECT_URI`
- `FIREBASE_SERVICE_ACCOUNT_KEY` (Base64 or JSON string safely parsed)

## 次に実装すべき最小単位のタスク

セッション有効期限切れ時の、カスタムトークンの自動再発行・再サインインフローの堅牢化。
