# 構成拡張メモ（追加済み）

## 新規追加フォルダ
- apps/    : 画面（フロント）
- api/     : サーバー/API
- infra/   : 環境設定デプロイ
- scripts/ : 補助処理

## secrets管理
- .env は Git 管理しない
- .env.example をテンプレとして使う