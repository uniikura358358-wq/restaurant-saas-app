# DATA_02_STATUS.md（状態定義）

## 1. 予約ステータス (status)

- `BOOKED`: 予約完了（未確認）。
- `CONFIRMED`: 来店確認済み（Confirm成功）。
- `CANCELED`: キャンセル（顧客または店舗操作）。
- `NO_SHOW`: 無断キャンセル（当日来店なし）。

## 2. 通知ステータス

- `UNSENT`: 未送信。
- `SENT`: 送信済み。
- `OPENED`: リンク開封済み（将来）。
- `FAILED`: 送信失敗。
