# AIモデル最新仕様書 (2026年2月更新)

本プロジェクトで使用する Vertex AI (Gemini) のモデル ID と運用ルールの定義です。

---

## 1. 推奨モデル一覧

| モデル表示名 | Vertex AI モデル ID | 特徴 |
| :--- | :--- | :--- |
| **Gemini 3 Flash (Preview)** | `gemini-3-flash-preview` | 2026年最新。超高速推論。Thinking Level 対応。 |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | 低遅延・高知能のバランス型。低コスト。 |
| **Gemini 2.5 Flash Image** | `gemini-2.5-flash-image` | 画像生成専用。全プラン共通。 |

---

## 2. プラン別モデルポリシー（2026-02-20 確定）

### 🟦 STANDARD プラン

| 項目 | 設定 |
| :--- | :--- |
| メインモデル | `gemini-2.5-flash` |
| サブモデル | `gemini-3-flash-preview` (LOW) |
| 画像生成 | `gemini-2.5-flash-image` |

**切替条件（サブモデルを使う特殊ケース）:**

- 口コミが★1〜2
- ネガティブワードを含むレビュー
- 感情理解が必要な長文クレーム

---

### 🟪 Pro プラン

| 項目 | 設定 |
| :--- | :--- |
| メインモデル | `gemini-3-flash-preview` (LOW) |
| サブモデル | `gemini-2.5-flash` |
| 画像生成 | `gemini-2.5-flash-image` |

**切替条件（サブに落とすケース）:**

- 高速レスポンスが必要な短文タスク（自動判断）

---

### 🟧 Pro Premium プラン

| 項目 | 設定 |
| :--- | :--- |
| メインモデル | `gemini-3-flash-preview` (LOW)（常時） |
| サブモデル | `gemini-2.5-flash`（速度必要時のみ） |
| 画像生成 | `gemini-2.5-flash-image` |

**特記:**

- 全テキスト生成は基本すべて 3 Flash LOW
- 多言語返信（英語/中国語）も 3 Flash LOW で処理

---

## 3. 機能別パラメータ定義（全プラン共通値）

### ① Google口コミ 自動返信

| パラメータ | 値 |
| :--- | :--- |
| temperature | 0.3 |
| top_p | 0.85 |
| top_k | 30 |
| max_output_tokens | 220 |

**出力ポリシー:**

- 日本語・敬語・絵文字可（emoji_level 設定に従う）
- 200〜250文字以内
- 感謝 → お詫び → 改善 → 来店誘導 の構成
- 個人名NG / 店舗名OK

**プラン別モデル切替:**

| プラン | ★3〜5 | ★1〜2 |
| :--- | :--- | :--- |
| STANDARD | 2.5 Flash | **3 Flash LOW** |
| Pro | 3 Flash LOW | 3 Flash LOW |
| Pro Premium | 3 Flash LOW | 3 Flash LOW |

**絵文字ルール（全プラン共通）:**

- ★3〜5：emoji_level 設定どおり（なし/控えめ/普通/多め）
- ★1〜2：最大2個まで（謝罪系絵文字のみ）

---

### ② Instagram 半自動投稿

**キャプション/タグ生成:**

| パラメータ | 値 |
| :--- | :--- |
| temperature | 0.7 |
| top_p | 0.9 |
| top_k | 40 |
| max_output_tokens | 350 |

**画像生成:**

- モデル：`gemini-2.5-flash-image`
- サイズ：1024×1024（1:1）/ 4:5（縦）選択可
- 1リクエスト1枚（ユーザー明示指示時は複数可）
- テキスト入れ最小限（外部ツール推奨）

---

### ③ AI領収書処理（事務作業）

| パラメータ | 値 |
| :--- | :--- |
| temperature | 0.1 |
| top_p | 0.7 |
| top_k | 20 |
| max_output_tokens | 256 |

**出力ポリシー:**

- 出力は必ず JSON
- 不明項目は `null` / `"unknown"`
- エラー時：`{ "error_message": "...", "raw_input": "..." }`

**使用モデル:** プランのメインモデルに従う

| プラン | 使用モデル |
| :--- | :--- |
| STANDARD | `gemini-2.5-flash` |
| Pro | `gemini-3-flash-preview` (LOW) |
| Pro Premium | `gemini-3-flash-preview` (LOW) |

---

### ④ POP / メニュー AI 自動生成

**キャッチコピー:**

| パラメータ | 値 |
| :--- | :--- |
| temperature | 0.7 |
| top_p | 0.9 |
| top_k | 40 |
| max_output_tokens | 256 |

**説明文:**

| パラメータ | 値 |
| :--- | :--- |
| temperature | 0.5 |
| top_p | 0.85 |
| top_k | 30 |
| max_output_tokens | 512 |

**画像:**

- モデル：`gemini-2.5-flash-image`
- サイズ：1024×1024
- テキスト入れ少なめ

---

### ⑤ AIチャットボット（相談窓口）

| パラメータ | 値 |
| :--- | :--- |
| temperature | 0.4 |
| top_p | 0.85 |
| top_k | 30 |
| max_output_tokens | 512 |

**出力ポリシー:**

- 箇条書き中心・絵文字使用可・1応答1テーマ
- 使用モデル：各プランのメインモデル

---

## 4. コンテキスト管理（全プラン共通）

- 直近3〜4ターン＋要約1件のみ保持
- 長い履歴は破棄し、新規セッションに切替
- 大量画像読込後は必ずセッション終了
- **Thinking Budget: 常に LOW**
- 無駄な長文生成は禁止

---

## 5. 禁止事項

- 個人情報の書き込み
- 無駄に長い文章
- モデルの勝手な切替
- 画像生成のバッチ実行（ユーザー明示指示時は複数可）
- 技術的内部情報の露出

---

## 6. 実装メモ（エンジニア向け）

```typescript
// プラン別ポリシー取得
const { getPlanAiPolicy } = await import("@/lib/vertex-ai");
const planPolicy = getPlanAiPolicy(planName);
// planPolicy.primary / secondary / primaryNeedsThinking / secondaryNeedsThinking

// Gemini 3系は global エンドポイント必須
// Gemini 2.5系は us-central1 エンドポイント
```

- `gemini-3-flash-preview` → **global** エンドポイント
- `gemini-2.5-flash` → `us-central1` エンドポイント
- Gemini 3系には必ず `thinking_config: { thinking_level: 'LOW', include_thoughts: false }` を付与
