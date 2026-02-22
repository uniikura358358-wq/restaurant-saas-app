# DATA_01_ENTITIES.md（Entity定義）

## 1. Reservation (予約)

- `reservationId`: UUID
- `storeId`: UUID
- `reservedAt`: Timestamp (予約日時)
- `partySize`: Integer
- `guestName`: String (任意)
- `contactInfo`: String (Phone / Email / LineId)
- `status`: Enum (BOOKED, CONFIRMED, CANCELED, NO_SHOW)
- `source`: String (Manual, CSV, WebForm)

## 2. ReservationPolicy (キャンセルポリシー)

- `policyId`: UUID
- `storeId`: UUID
- `content`: Text (ポリシー本文)
- `version`: Integer
- `isDefault`: Boolean

## 3. NotificationLog (通知ログ)

- `logId`: UUID
- `reservationId`: UUID
- `type`: Enum (EMAIL, LINE, SMS)
- `trigger`: Enum (AUTO_PRE_DAY, REMIND, MANUAL)
- `sentAt`: Timestamp
- `deliveredAt`: Timestamp
