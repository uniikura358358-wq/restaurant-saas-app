# 本番環境デプロイ手順書 (Production Readiness Guide)

本ドキュメントは、テストモードからライブモード（本番環境）へ安全に切り替えるための手順をまとめたものです。

## 1. 環境変数の監査チェックリスト

本番環境（Vercel）には、以下の「Live用」のキーを設定してください。

### Whop (決済・権限)

- [ ] `WHOP_API_KEY`: **Live API Key**（Whop Dashboard > Settings > Developer ページから取得）
- [ ] `NEXT_PUBLIC_WHOP_CLIENT_ID`: 本番用 Client ID
- [ ] `WHOP_CLIENT_SECRET`: 本番用 Client Secret
- [ ] `WHOP_PRODUCT_ID_BUSINESS`: **本番用** Businessプランの商品ID
- [ ] `WHOP_PRODUCT_ID_LIGHT`: **本番用** Lightプランの商品ID
- [ ] `WHOP_WEBHOOK_SECRET`: 本番用 Webhook Secret（Webhook登録時に発行）

### Supabase (データベース)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`: 本番用プロジェクトのURL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`: 本番用 Anon Key
- [ ] `SUPABASE_SERVICE_ROLE_KEY`: 本番用 Service Role Key（**絶対に公開しない**）

### AI / その他

- [ ] `GOOGLE_API_KEY`: Google Cloud / Gemini 本番用キー
- [ ] `NEXT_PUBLIC_APP_URL`: 本番URL（例: `https://your-restaurant-saas.vercel.app`）

---

## 2. Whop 本番用商品IDの取得方法

1. [Whop Dashboard](https://whop.com/hub/) にログインします。
2. 「Products」セクションをクリックします。
3. 実際に販売する商品（Businessプラン等）を選択します。
4. URL または商品詳細ページの「Product ID」を確認します（例: `prod_XXXXXXXXXXXX`）。
5. 取得したIDを Vercel の環境変数に設定します。

---

## 3. Webhook 戦略

本番環境では、決済やプラン変更をリアルタイムに反映するために Webhook の設定が必須です。

### 登録手順

1. Whop Dashboard > Settings > Developer > Webhooks へ移動。
2. 「Add New Webhook」をクリック。
3. **Webhook URL**: `https://<your-domain>.com/api/auth/whop/webhook` を入力。
4. **Events**: `membership.created`, `membership.updated`, `membership.cancelled` を選択。
5. 発行された **Webhook Secret** を Vercel の `WHOP_WEBHOOK_SECRET` に設定。

---

## 4. Vercel での設定手順

1. Vercel Dashboard > プロジェクト選択 > Settings > Environment Variables。
2. 上記のチェックリストに従い、キーと値を一つずつ正確に入力します。
3. **重要**: 設定後、必ず **"Deployments" から最新のビルドを "Redeploy"** してください。環境変数は再デプロイされるまで反映されません。

---

## 5. 安全な移行のための重要事項

> [!CAUTION]
>
> - `NEXT_PUBLIC_` が付く変数はブラウザから参照可能です。秘匿が必要なキー（`WHOP_API_KEY`, `WHOP_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`）には絶対に付けないでください。
> - 本番URLでの初回購入テストを必ず実施し、Supabase の `profiles` テーブルに正しいプラン名が反映されるか確認してください。
