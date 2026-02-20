# 🏗️ 新機能（経営・事務管理AI）技術設計書

## 1. 概要

「スマホで一次入力、PCで最終確認、Googleシートで完全同期」を実現するための技術基盤を定義する。

## 2. データ構造 (Firestore)

### `stores/{storeId}/business_config`

- `openingHours`: 営業時間オブジェクト
- `tableCount`: 席数
- `targetFoodCostRatio`: 目標原価率
- `connectedGoogleSheetId`: 連携済みシートID

### `stores/{storeId}/accounting` (サブコレクション)

- `id`: ドキュメントID
- `type`: 'sales' | 'expense'
- `source`: 'camera' | 'manual' | 'voice'
- `imageUrl`: Storageパス (type: camera時)
- `category`: 勘定科目 (AIが自動付与)
- `amount`: 金額
- `vendor`: 取引先
- `status`: 'pending' (未確認) | 'confirmed' (経理確認済)
- `voiceMemo`: 音声テキスト化データ
- `createdAt`: 登録日時

## 3. 核心技術スタック

### ① AI解析 (Gemini 3 Pro / Flash)

- **OCR:** `imageToText` 機能でレシート・納品書から情報を抽出。
- **分類:** 自然言語理解により、品目名から「食材」「消耗品」などのカテゴリを推論。
- **音声:** `Web Speech API` でリアルタイムテキスト化後、Geminiで意味を補正。

### ② 外部連携 (Google Sheets API)

- `appendRow`: 確認済みデータをシートの末尾へ自動追記。
- `readValues`: シート内の過去データを読み取り、分析グラフの種データとする。

### ③ ストレージ管理

- **Firebase Storage:** 原寸大画像を保存。
- **Image Transformation:** `canvas` または外部ライブラリを用いて、一覧用のサムネイル（超軽量）を自動生成し、転送量を削減。

## 4. UI/UX コンセプト

### 【スマホ版】（スピード重視）

- フローティングアクションボタン (FAB) による「即カメラ起動」。
- 音声録音中の波形アニメーション。
- AI解析結果の「チャット風プレビュー」。

### 【PC版】（正確性重視）

- サイドバイサイド表示（画像 ⇔ 編集フォーム）。
- ショートカットキー (`Enter` で確定、`Esc` で戻るなど) の徹底。
- 大画面を活かした Recharts 等による多角的な分析グラフ。

## 5. ロードマップ

1. **Phase 1:** 店舗基本設定 UI と Firestore スキーマの実装。
2. **Phase 2:** 書類撮影カメラ ＋ Gemini による OCR プロトタイプ。
3. **Phase 3:** Google Sheets API 連携と自動書き込み。
4. **Phase 4:** 音声入力サポートと AI コンシェルジュ機能の統合。
