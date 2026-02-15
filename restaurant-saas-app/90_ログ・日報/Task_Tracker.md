# Task Tracker

## 進行中プロジェクト: Restaurant SaaS

- [x] Phase 1: 銀座ラーメンLP (完了)
- [ ] Phase 2: SaaS Dashboard Implementation
  - [x] Dashboard UI 実装
  - [x] AI返信機能 (Gemini API v3/v2.5)
  - [x] クリップボードコピー機能
  - [x] データベース連携 (Supabase Reviews)
  - [x] Google Business Profile 連携 (API/Sync)
  - [x] Firebase 連携 (Authentication/Firestore)
    - [x] Firestore ユーティリティ作成 (`src/lib/db-actions.ts`)
    - [x] ダッシュボードへの Firestore 統合 (`src/app/page.tsx`)
    - [x] Firebase Auth 実装 (`useAuth`, Login Page, Guard)
    - [x] Firestore セキュリティ強化 (Data Isolation)
      - [x] `saveReply` に `userId` 追加
      - [x] `getAllReplies` に `userId` フィルタ追加
      - [x] Firestore セキュリティルール策定
  - [ ] 決済機能 (Stripe) (Phase 3)
    - [x] Stripe パッケージ導入 & 環境変数設定
    - [x] プラン定数定義 (Price IDs)
    - [x] Checkout API Route 実装
    - [ ] Webhook API Route 実装 (firebase-admin利用)
    - [x] UI実装 (料金プランページ刷新・各種ボタン)
  - [ ] プラン管理機能 <!-- 依存: Stripe, Auth -->
    - [ ] SMS送信機能 <!-- 依存: Twilio/AWS SNS -->

## 完了報告ログ

- **2026-02-16**: 料金プランページ (`/plans`) のデザイン刷新。枠線欠け問題の修正、各プランの視認性向上、WEBページ作成代行プランへの導線追加。AIチャットボタンのUI改善。
- **2026-02-15**: Firebase Authentication 実装完了。ログイン機能、ダッシュボード保護、ログアウト機能を配備。
