---
title: Access Control 統合モジュール
description: ユーザーのプランに基づいた機能制限とセキュリティ制御の設計
category: System Module
scalability_score: S
tech_stack: [Next.js, Supabase, Whop]
updated_at: 2026-02-16
---

## 1. 概要

本モジュールは、Whop認証で取得したサブスクリプション情報を基に、アプリケーション内での機能利用権限を統括管理する。UIレベルの制限（UX向上）とバックエンドレベルの制限（セキュリティ確保）の二層構造で構成される。

## 2. コアロジック: `usePlanGuard.ts`

フロントエンドでの権限判定に使用するカスタムフック。

### プラン定義

判定ミスの防止、および将来のプラン変更への柔軟な対応のため、定数オブジェクト `PLAN_NAMES` を使用する。

```typescript
export const PLAN_NAMES = {
    FREE: 'Free',
    LIGHT: 'Light',
    STANDARD: 'Standard',
    BUSINESS: 'Business',
    PREMIUM: 'Premium',
    PRO: 'Pro'
} as const;
```

### 機能別権限マッピング

| 機能識別子 | 許可されるプラン | 保護対象ルート/コンポーネント |
| :--- | :--- | :--- |
| `instagram` | Standard以上 | `/settings/store`, `/settings/website-materials` |
| `ai_pop` | Premium以上 | `/pop-generator` (予定) |
| `priority_support`| Premium以上 | サポートチャット (予定) |

## 3. リスク管理と多層防御 (Risk Analysis)

### ① フロントエンド突破への対策 (Backend Defense)

ユーザーがブラウザのデベロッパーツール等でUI制限を解除しても、最終的なデータ送信先である **Server Actions / API Endpoint** 側で以下の二重チェックを実施する。

- API呼び出し時に、サーバーサイドで再度 `profiles.plan_name` を取得。
- 権限がない場合は、処理を実行せず直ちに `403 Forbidden` を返す。

### ② 同期遅延への対策 (Sync Lag)

Whopでのプランアップグレード直後、Supabaseへの同期に数秒のラグが発生する場合がある。これを解消するため、ロック画面に **「プラン情報を更新」** ボタンを設置し、手動での再取得（`refreshPlan`）を可能にする。

### ③ 環境別設定の分離 (Environment Management)

Whopの Product ID 等は、開発環境と本番環境で異なる。`.env.local` への切り出しにより、環境ごとの安全なデプロイを実現する。

### ④ Firebase依存の完全排除 (Dependency Hygiene)

移行完了後、`firebase-admin` および `firebase` パッケージ自体を `npm uninstall` することで、セキュリティホールを最小化し、アプリケーション全体の軽量化を図る。

## 4. 保護対象ディレクトリ一覧

- `src/app/settings/store/page.tsx`
- `src/app/settings/store/website-materials/page.tsx`
- `src/app/api/instagram/...` (予定)
