# P03_HP作成代行・AIチャットボット_v1.md

## 概要

飲食店向けの簡易ランディングページ (LP) 自動生成と、訪問者対応を行う AI チャットボット機能。

## ロジック・ワークフロー

1. **LP生成**:
   - `stores` コレクションの `websiteMaterials`（画像、キャッチコピー、メニュー）を元に動的にページを生成。
   - Next.js (App Router) の Dynamic Routes を使用。
2. **チャットボット**:
   - Gemini API による店舗固有情報の RAG (Retrieval-Augmented Generation) 対応。
   - 予約導線への誘導（外部リンクまたは Stripe 決済）。
3. **販売誘導**:
   - ユーザーの離脱意図を検知した際のクーポン提示。

## 手動設定手順 (Admin Console)

1. **Domain/DNS**:
   - Vercel 等でのカスタムドメイン設定。
2. **Firestore**:
   - `chatbot_logs` コレクションの作成。

## 環境変数・依存項目

- `NEXT_PUBLIC_SITE_URL`: LP アクセス用。
- Package: `react` (19.2.3), `framer-motion` (v12.34.0)

## Next Step

チャットボット経由の「直接予約」を実現するためのカレンダー連携の実装。
