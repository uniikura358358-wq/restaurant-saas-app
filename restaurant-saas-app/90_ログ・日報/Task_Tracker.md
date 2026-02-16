# Firebase Unification Tasks (Final Plan)

- [x] **Phase 0: Safety & Inventory** `[x]`
  - [x] 環境変数チェック (`src/lib/check-env.ts`)
  - [x] データ台帳 (`Data_Inventory.md`)
- [x] **Phase 1: Auth Boundary** `[x]`
  - [x] `useAuth` の厳格化と `storeId` 取得の共通化
  - [x] Server Side Auth Verification (`verifyIdToken`) の実装
  - [x] `submit-reply` API の認証を Firebase Auth に変更
- [ ] **Phase 2: Data Unification (Firestore Migration)**
  - [ ] **Stats Design**: `tenants/{id}/stats` スキーマ定義
  - [ ] **Pagination Logic**: `orderBy(createdAt, id)` + `startAfter` 実装
  - [ ] `src/app/dashboard/page.tsx` を Firestore Admin SDK 読み取りに変更
- [ ] **Phase 3: API Reliability**
  - [ ] **Idempotency**: `requests/{requestId}` コレクション作成
  - [ ] **Transaction**: 返信保存APIに「Stats更新 + 冪等性チェック」を実装
  - [ ] `ReviewReplyButton` からの API 呼び出しに `requestId` (UUID) を付与
- [ ] **Phase 4: Optimization & Cleanup**
  - [ ] Firestore Indexes (複合インデックス) の設定
  - [ ] Supabase 関連コード完全削除
