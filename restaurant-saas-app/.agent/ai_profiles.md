# AI 開発プロファイル定義

APIコストを抑えつつ、コード作成と画像試作を安定運用するためのプロファイル定義です。

## 1. コード生成（常用）プロファイル

**プロファイル名:** `coding_low_cost_flash`  
**用途:** デフォルトのコード生成（常用）

- **モデル:** `gemini-3-flash-preview`
- **temperature:** `0.1`
- **topP:** `0.9`
- **candidateCount:** `1`
- **maxOutputTokens:** `1200`（必要時のみ `2000`）
- **thinkingLevel:** `MINIMAL`
- **Grounding（検索/Maps）:** `OFF`
- **画像/音声/動画入力:** 使わない時はOFF

## 2. コード生成（難問）プロファイル

**プロファイル名:** `coding_hard_pro31`  
**用途:** 設計・難問・詰まった時のみ

- **モデル:** `gemini-3.1-pro-preview`
- **temperature:** `0.1`
- **topP:** `0.9`
- **candidateCount:** `1`
- **maxOutputTokens:** `2000`（必要時のみ `3000`）
- **thinkingLevel:** `LOW`
- **Grounding（検索/Maps）:** `OFF`（必要な時だけON）

## 3. ナノバナナ（画像生成）試作プロファイル

**プロファイル名:** `nanobanana_draft_pop`  
**目的:** 構図・雰囲気の確認（低コスト）

- **画像サイズ:** 1024x1024（選べる範囲で最小〜中）
- **生成枚数:** 1枚
- **バリエーション:** 1
- **高解像度化 / アップスケール:** OFF
- **高品質補正:** OFF
- **背景除去:** OFF
- **文字入り生成:** 最小限（基本は文字なし）

## 4. ナノバナナ（画像生成）本番プロファイル

**プロファイル名:** `nanobanana_final_pop`  
**目的:** 最終出力のみ品質を上げる

- **画像サイズ:** 用途に応じて必要最小限で上げる
- **生成枚数:** 1枚
- **アップスケール:** 必要時のみON
- **高品質補正:** 必要時のみON
- **背景除去:** 必要時のみON
- **文字:** 後載せ（Canva/Figma/HTML等）を優先

## 実行ルール

- 普段は必ず `coding_low_cost_flash` を使用。
- 難問時のみ `coding_hard_pro31` を使用。
- 画像は必ず `nanobanana_draft_pop` で試作してから `nanobanana_final_pop`。
- 候補数は常に1を維持。
- Groundingは明示的に必要な時だけON。
