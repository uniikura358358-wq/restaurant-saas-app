# Antigravity向け指示書（フォルダ理解適切格納）

## 目的
このプロジェクトのフォルダ意味を理解し、既存ファイルを適切なフォルダへ整理する。
誤って秘密情報を docs/ や共有フォルダへ保存しない。

## 最重要ルール
- 親フォルダ estaurant-saas-suite/ を基準に作業する
- 迷ったらまず docs/ に一時保管し、分類メモを付ける
- APIキー、秘密鍵、トークンは .env にのみ保存（.env.example はダミー）
- 実顧客データ領収書画像個人情報は shared-assets/ に置かない
- 機能専用素材は共通化できるまで各機能フォルダに置く

## フォルダの意味（要約）
- google-review-reply/ : Google口コミ返信機能
- instagram-post/ : Instagram投稿補助機能
- i-secretary/ : AI秘書機能
- i-pop-menu/ : AI POP/メニュー作成機能
- office-work-efficiency/ : 事務作業効率化機能
- shared-assets/ : 共通素材
- docs/ : 仕様メモルール
- pps/ : 画面コード
- pi/ : サーバー/APIコード
- infra/ : 環境設定デプロイ設定
- scripts/ : 補助処理
- .env : 秘密情報（Git管理しない）

## 既存ファイルの振り分け指示（判断ルール）
### A. まず種類を判定する
1. 説明要件計画メモ  docs/
2. 画像ロゴテンプレサンプル  shared-assets/ または機能フォルダ
3. 画面のコード（UI/ページ/コンポーネント）  pps/
4. API/サーバーコード（エンドポイント、Webhook、DB接続）  pi/
5. デプロイ/環境設定（hosting, deploy, CI関連）  infra/
6. 補助処理（変換、移行、一括処理）  scripts/
7. 秘密情報（APIキー等）  .env（テキスト資料に書かない）

### B. 次に機能を判定する（機能専用なら）
- Google口コミ返信に関係  google-review-reply/
- Instagram投稿に関係  instagram-post/
- AI秘書に関係  i-secretary/
- AI POP/メニューに関係  i-pop-menu/
- 事務効率化に関係  office-work-efficiency/

### C. 共通かどうかを判定する
- 2つ以上の機能で使う  shared-assets/ または docs/
- 1つの機能だけで使う  その機能フォルダ

## 推奨整理手順（安全）
1. 既存ファイルを一覧化する（削除しない）
2. docs/migration/ に移行メモを作る
3. まずコピーで移動（cutではなくcopy）
4. 振り分け後に確認
5. 問題なければ元ファイルを整理
6. .env 対象が混ざっていないか再確認

## NG例（避ける）
- APIキーを README.md や docs/*.md に書く
- 顧客データを shared-assets/sample-data/ に入れる
- 画面コードとAPIコードを同じ場所に混在させる
- 何でも shared-assets/ に入れる

## 迷った時の一時置き場
- 説明系で迷う  docs/
- 実装系で迷う  docs/migration/ に「保留メモ」を作ってから判断