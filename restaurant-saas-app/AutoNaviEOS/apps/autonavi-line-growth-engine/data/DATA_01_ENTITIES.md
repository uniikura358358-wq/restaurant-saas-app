# DATA_01_ENTITIES.md（Entity定義）

## 1. LineStoreConfig

- `storeId`: UUID
- `lineChannelId`: String
- `lineChannelSecret`: String (Secret)
- `frequencyLimit`: Integer (月間上限)

## 2. LineCampaign (配信計画)

- `campaignId`: UUID
- `storeId`: UUID
- `scheduledAt`: Timestamp
- `segment`: Enum (ALL, NEW, REGULAR, SLEEPING)
- `theme`: String
- `status`: Enum (PLANNED, RUNNING, DONE)

## 3. LineDraft (下書き)

- `draftId`: UUID
- `campaignId`: UUID
- `content`: Text
- `approvalStatus`: Enum (DRAFT, APPROVED, REJECTED)
- `aiScore`: Integer (配信品質スコア - 将来)

## 4. LineWeeklyReport (週次レポート)

- `reportId`: UUID
- `storeId`: UUID
- `periodStart`: Date
- `periodEnd`: Date
- `metrics`: { `sentCount`, `blockCount`, `clickRate` }
- `suggestion`: Text (次週の提案)
