# 📊 データ管理台帳 (Data Inventory)

**Last Updated:** 2026-02-17
**Status:** Phase 0 (Migration Planning)

このドキュメントは、システム内で管理される「業務データ」の所在と、Firebase 完全統合（Unification）に向けた移行計画を定義します。

## 1. データ所在マップ

| データ種別 | 現在の場所 (As-Is) | 移行後の場所 (To-Be) | 移行フェーズ | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| **ユーザー認証** | **Firebase Auth** | **Firebase Auth** | - | 変更なし (UIDを正とする) |
| **ユーザープロファイル** | Firestore (`profiles`) | Firestore (`profiles`) | Phase 1 | プラン、Stripe状態を集約 |
| **口コミデータ (Reviews)** | **Supabase (`reviews`)** | **Firestore (`reviews`)** | **Phase 2** | 最大の移行対象 |
| **返信データ (Replies)** | **Supabase (`reviews`)** | **Firestore (`replies`)** | **Phase 2** | Reviewと分離して管理 |
| **AI生成ログ** | Firestore (`replies`*) | Firestore (`ai_logs`) | Phase 3 | *現在はrepliesに混在 |
| **利用クォータ** | Firestore (`profiles`) | Firestore (`profiles`) | Phase 3 | Atomic Increment 必須 |
| **Stripe 顧客情報** | Stripe Dashboard | Firestore (`profiles`) | Phase 3 | Webhookで同期 |

## 2. Firestore Schema Design (To-Be)

統合後の Firestore 設計案です。

### Collection: `profiles` (Users)

- Document ID: `userId` (Firebase UID)

```json
{
  "email": "user@example.com",
  "plan": "premium", // free, standard, premium
  "subscriptionStatus": "active",
  "storeId": "store_123", // Google Business Profile ID
  "aiUsageCount": 42,
  "lastLoginAt": "timestamp"
}
```

### Collection: `reviews` (業務データ)

- Document ID: `googleReviewId` (本来のID) または UUID

```json
{
  "userId": "firebase_uid", // Index
  "storeId": "store_123",   // Index
  "author": "Customer Name",
  "rating": 5,
  "content": "美味しかった！",
  "status": "replied", // pending, replied
  "platform": "google",
  "publishedAt": "timestamp",
  "fetchedAt": "timestamp"
}
```

### Collection: `replies` (返信データ)

- Document ID: `reviewId` と同一 (1:1関係)

```json
{
  "userId": "firebase_uid",
  "content": "ありがとうございます！",
  "generatedBy": "ai", // ai, manual
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Collection: `stats` (Dashboard Optimization)

- Document ID: `userId_dashboard`

```json
{
  "userId": "firebase_uid",
  "totalReviews": 150,
  "unrepliedCount": 5,
  "averageRating": 4.5,
  "updatedAt": "timestamp"
}
```

## 3. 移行リスクと対策

- **Risk**: Firestore の Read 課金増大
  - **Countermeasure**: `stats` ドキュメントによる読み取り最小化と、ダッシュボードのページング実装。
- **Risk**: 移行中のデータ不整合
  - **Countermeasure**: Phase 2 移行中はメンテナンスモードとし、Supabase への書き込みを完全に停止する。
