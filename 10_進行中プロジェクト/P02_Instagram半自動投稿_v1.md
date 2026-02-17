# P02_Instagram半自動投稿_v1.md

## 1. 概要

店舗の魅力をAIが要約・画像化し、Instagram Graph API を通じて予約投稿を行うプロモーション支援機能。

## 2. ワークフロー詳細

1. **コンテンツ解析**: 口コミや店舗情報を Gemini で解析し、インスタ映えするキャプションを生成。
2. **画像管理**: Firebase Storage の `public` フォルダへメディアをアップロードし、一時的な公開URLを取得。
3. **API連携**:
   - `IG User Insights` API で最適な投稿時間を算定（将来拡張）。
   - `Media Container` 作成（POST /media） -> `Media Publish`（POST /media_publish）。

## 3. DB構造 (Firestore)

- **`instagram_posts/{postId}`**:
  - `caption`: string (AI生成テキスト)
  - `mediaUrl`: string (Firebase Storage URL)
  - `scheduledAt`: Timestamp (予約投稿日時)
  - `status`: "pending" | "processing" | "published" | "failed"

## 4. 環境変数・手順書

- `INSTAGRAM_ACCESS_TOKEN`: Meta ビジネスログイン経由の永続トークン。
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`: 連携済み Instagram プロファイル ID。

### 管理画面手動設定

- Facebook Business Suite にて Instagram アカウントのリンク。
- Meta App ダッシュボードにて `Media Content Publish` 権限の App Review 通過。

## Next Step

Firebase Storage の画像アップロードから Graph API へのコンテナ登録までの疎通検証プログラムの実装。
