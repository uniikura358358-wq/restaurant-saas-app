# P03_HP作成代行・AIチャットボット_v1.md

## 1. 概要

店舗設定に基づいた静的ランディングページ (LP) の自動生成と、Gemini を活用した接客用AIチャットボットの統合。

## 2. 実装ロジック

- **Web生成**: `stores` コレクション内の `websiteMaterials` ( catchCopy, images, menus) を Next.js Server Components で動的に合成。
- **ボット連携**:
  - ユーザーの質問に対し、`websiteMaterials` 全体をコンテキストとして Gemini に投入。
  - **Stripe連携**: 予約ボタンクリック時に Stripe Checkout (`api/stripe/checkout`) へリダイレクトし、事前決済または予約確保を実行。

## 3. DB構造 (Firestore)

- **`stores/{uid}/websiteMaterials`**:
  - `catchCopy`: string
  - `images`: Map (interior, menu1, menu2...)
  - `menus`: Array (itemName, price, description)
- **`chatbot_logs/{userId}`**:
  - `messages`: Array ({ role: "user" | "bot", text: string, timestamp: Date })

## 4. 環境変数・セキュリティ

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: フロントエンド決済用。
- `STRIPE_SECRET_KEY`: サーバーサイド決済実行用。
- `NEXT_PUBLIC_SITE_URL`: Webhook 戻り先URL。

## Next Step

`websiteMaterials` が更新された際の、Next.js On-demand Revalidation (ISR) の発火トリガーの実装。
