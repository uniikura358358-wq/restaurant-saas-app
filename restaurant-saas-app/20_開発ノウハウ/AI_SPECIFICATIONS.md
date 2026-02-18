# AIモデル最新仕様書 (2026年2月更新)

本プロジェクトで使用する Vertex AI (Gemini) のモデル ID と運用ルールの定義です。

## 1. 推奨モデル一覧 (Stable IDs)

Vertex AI では、特定のバージョン番号（-001等）を使わず、エイリアス（-latest等）を使用することで、Google が提供する最新の安定版を自動的に参照できます。

| モデル表示名 | Vertex AI モデル ID | 特徴 |
| :--- | :--- | :--- |
| **Gemini 3 Pro (Preview)** | `gemini-3-pro-preview` | **2026年最新**。推論特化型。複雑な推論・プランニング向け。 |
| **Gemini 3 Flash (Preview)** | `gemini-3-flash-preview` | **2026年最新**。超高速推論。Thinking Level 対応。 |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | 高度な推論、コーディング、1Mトークン対応。 |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | 低遅延・高知能のバランス型。標準的な自動返信に使用。 |
| **Gemini 2.0 Flash** | `gemini-2.0-flash-001` | 安定版。旧環境からの互換性維持に利用。 |

## 2. 旧モデルの状態 (Retirement)

以下のモデルは 2025 年にリタイアしており、現在は使用できません（404 エラーとなります）。

- `gemini-1.5-pro-001/002`: **使用不可** (2025/09 リタイア)
- `gemini-1.5-flash-001/002`: **使用不可** (2025/09 リタイア)

## 3. 実装上のマッピングルール (`vertex-ai.ts`)

プロジェクト内では以下の名称をキーとして、最新モデルへマッピングします。

- `gemini-3-pro-preview` -> メイン採用（Google口コミ返信 / Instagram投稿）
- `gemini-3-flash-preview` -> サブ採用
- `gemini-2.5-flash` -> 予備
- `gemini-1.5-flash` -> `gemini-2.5-flash` (互換維持)
- `gemini-1.5-pro` -> `gemini-2.5-pro` (互換維持)

## 4. 運用ルール (2026-02-18 決定)

| 機能 | メインモデル | 設定 | サブモデル |
| :--- | :--- | :--- | :--- |
| **Google口コミ返信** | **Gemini 3 Pro** | Thinking: **LOW** | Gemini 3 Flash |
| **Instagram投稿** | **Gemini 3 Pro** | Thinking: **LOW** | Gemini 3 Flash |

### Gemini 3 (Preview) の有効化と設定手順

Gemini 3 Pro/Flash Preview を利用するには、以下の設定が必須です。

1. **モデル ID**:
    - `gemini-3-pro-preview`
    - `gemini-3-flash-preview`
2. **ロケーション制限**:
    - **`global` エンドポイント**が必須です。
    - APIエンドポイントは `aiplatform.googleapis.com` を明示的に指定します。
3. **独自パラメータ (`thinking_level`)**:
    - `LOW`: 低レイテンシ（高速応答）。
    - `HIGH`: 最高度の推論（デフォルト・動的思考）。
4. **実装コード例 (Node.js)**:

    ```typescript
    const model = getGenerativeModel("gemini-3-pro-preview");
    const result = await model.generateContent({
        contents: [...],
        generationConfig: {
            thinking_config: { include_thoughts: false, thinking_level: "LOW" }
        }
    });
    ```

## 5. 注意事項

- **リージョン**: Gemini 3 は `global`、それ以外は `us-central1` を原則使用します。
- **クォータ**: プレビュー版のため RPM 制限が厳格です。
- **データ処理**: プレビュー版の追加利用規約が適用されます。
