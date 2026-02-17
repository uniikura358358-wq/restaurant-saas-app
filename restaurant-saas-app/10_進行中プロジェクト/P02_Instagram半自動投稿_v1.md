# P02_Instagram半自動投稿_v1.md

## 概要

Instagram Graph API を利用し、{{SERVICE_NAME}} 内で生成した画像やテキストを予約投稿、または即時投稿する機能。

## ロジック・ワークフロー

1. **媒体連携**: Facebook Login / Instagram Graph API のアクセストークン取得。
2. **コンテンツ生成**: 店舗情報に基づいたキャプションの AI 生成。
3. **メディアアップロード**: 画像を Firebase Storage (または外部URL) にアップロードし、コンテナIDを取得。
4. **投稿予約**: Firestore (`instagram_posts` コレクション) に投稿予定日時を保存。
5. **公開**: 設定時刻に `media_publish` エンドポイントを叩き、投稿を完了。

## 手動設定手順 (Admin Console)

1. **Meta for Developers**:
   - アプリの作成（ビジネスタイプ）。
   - `instagram_basic`, `instagram_content_publish`, `pages_show_list` 権限の取得。
   - 無期限アクセストークンの発行。
2. **Firebase Console**:
   - Storage の Public Read 権限設定（投稿用メディア公開のため）。

## 環境変数・依存項目

- `INSTAGRAM_ACCESS_TOKEN`: API 通信用。
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: ページ ID。
- Package: `next` (v16.1.6), `firebase` (v12.9.0)

## Next Step

投稿後のエンゲージメント（いいね・コメント）の自動分析機能の実装。
