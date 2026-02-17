# Payment_System_Master.md

## 1. 概要

Stripe を用いたサブスクリプション決済、プラン管理、および Webhook による非同期状態更新ロジック。

## 2. 決済・課金プラン (2026/02/17版)

- **Light Plan**: ¥3,980/月 (税込)
- **Standard Plan**: ¥9,800/月 (税込)
- **Premium Plan**: ¥12,800/月 (税込)

## 3. Webhook 処理ロジック (`api/stripe/webhook`)

Stripe のイベントをトリガーに Firestore を更新する。

- **`checkout.session.completed`**: 決済完了時に `stripeCustomerId` を Firestore に紐付け、プランを `active` に更新。
- **`customer.subscription.deleted`**: 解約時にプランを `free` または `canceled` へ移行。
- **`invoice.payment_failed` (重要: 決済失敗フロー)**:
  1. **Phase 1 (Day 0 - 即時)**: `planStatus` を `locked` に変更。APIコストが発生する全機能を停止。
  2. **Phase 2 (Day 14)**: Web Option 保持者の場合、作成済み Web ページを非公開（メンテナンス画面）に変更。
  3. **Phase 3 (Day 31)**: サブスクリプション完全解約、ドメイン廃止プロセス開始。

## 4. 実装のポイント

- **冪等性 (Idempotency)**: `X-Request-ID` ヘッダーまたは Stripe Event ID を用い、Firestore トランザクション内で重複処理を防止。
- **メタデータ活用**: Stripe Checkout Session の `client_reference_id` に Firebase UID を埋め込み、確実にユーザーを紐付ける。

## 5. 必要環境変数

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## 次に実装すべき最小単位のタスク

Stripe Connect による将来的なマルチテナント決済（売上分配モデル）の基盤設計。
