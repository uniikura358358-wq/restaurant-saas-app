# P04_POP・メニュー自動作成_枠組み.md

## 1. 概要 (将来構想)

AI画像生成技術（DALL-E 3 / Stable Diffusion）を活用し、店舗内掲示用POPやメニュー表を自動デザインするクリエイティブ機能。

## 2. ワークフロー案

1. **素材入力**: `stores/websiteMaterials` から料理写真と説明を自動抽出。
2. **デザイン指示**: ユーザーが「季節限定」「おすすめ」等のタグを選択。
3. **画像生成**:
   - Gemini がデザインプロンプトを構成。
   - 画像生成 API を呼び出し、バリエーションを提示。
4. **オーバーレイ**: Canvas / SVG ライブラリを用いて、価格や店名を画像上に美しく配置。

## 3. DB構造案 (Firestore)

- **`designs/{designId}`**:
  - `baseImage`: string (Generated Image URL)
  - `overlayData`: JSON (Text position, fonts, stickers)
  - `type`: "pop" | "menu" | "flyer"

## 4. 依存関係（予定）

- `OPENAI_API_KEY`: DALL-E 3 利用用。
- Package: `canvas@v2.11` (Node.js環境での画像加工)。

## Next Step

Gemini API を用いた「画像生成のための詳細プロンプト構築」の試作と精度検証。
