# DATA_01_ENTITIES.md（Store/WaitTicket/Log等）

## 1. Store (店舗)

- `storeId`: UUID
- `name`: String
- `config`: { `maxWaitGroups`, `autoSkipTime`, `operatingHours` }

## 2. WaitTicket (整理券)

- `ticketId`: UUID
- `storeId`: UUID (FK)
- `displayNumber`: Integer (当日通し番号)
- `status`: Enum (WAITING, CALLED, GUIDED, SKIPPED, CANCELED)
- `partySize`: Integer
- `contactInfo`: String (Phone/Email/LineId - 最小化)
- `createdAt`: Timestamp
- `updatedAt`: Timestamp
- `calledAt`: Timestamp (最初に呼ばれた時刻)

## 3. AuditLog (監査ログ)

- `logId`: UUID
- `ticketId`: UUID (FK)
- `action`: String (CREATE, CALL, GUIDE, SKIP, CANCEL)
- `performedBy`: String (System / StaffUserId)
- `timestamp`: Timestamp
