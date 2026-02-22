# 保留メモ (Pending Migration Memo)

整理作業において、分類に迷うファイルや移動による影響が大きいファイルを記録します。

## 分類保留 / 相談が必要なファイル

- **.cursorrules** (Root): AntigravityやCursorの動作に必須。`docs/rules/` にコピーを置くが、オリジナルはルートに保持すべきか？
- **components.json** (Root): shadcn/ui の設定ファイル。ビルドに必要。
- **build_error.log / build_log.txt / tsc_error.log**: 一時的なログだが、過去の修正の参考になるため `docs/logs-daily-reports/` に移動。
- **src/app/api/**: `api/routes/` への整理を提案しているが、Next.jsの動作には `src/` フォルダ内にある必要がある。
  - 案: `api/` はロジックの参照用フォルダとし、実体は `src/` に残すか、または suite 内で完結する新構成にするか。
- **tools/**: `api/tools/` への整理。

## 秘密情報の確認が必要なファイル

- **.env.local**: ルートから動かさない。
- **AI_COST_ESTIMATES.md**: 金額情報を含むため、`docs/business-strategy/` への移動時に権限等に注意（今回はローカルのみなので問題なし）。

## 次のステップ

1. 方針への承認。
2. コピー作業。
3. 動作確認。
