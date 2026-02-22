import { adminDb } from "./firebase-admin";
import { getSubscriptionStatus, SubscriptionStatus, isAccessAllowed } from "./subscription";

/**
 * サーバーサイド (Server Actions / Route Handlers) でユーザーの購読ステータスを検証する
 */
export async function verifySubscriptionStatus(uid: string): Promise<SubscriptionStatus> {
    if (uid === "demo-user-id") return "active";

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return "active"; // 新規ユーザー等はデフォルト active

    const data = userDoc.data();
    const paymentFailedAt = data?.paymentFailedAt?.toDate() || null;

    return getSubscriptionStatus(paymentFailedAt);
}

/**
 * API利用が許可されているかサーバーサイドでチェックし、不可なら例外を投げる
 */
export async function enforceSubscriptionLock(uid: string, area: "ai_api" | "sns_api" | "dashboard" | "public_website" = "ai_api") {
    const status = await verifySubscriptionStatus(uid);

    if (!isAccessAllowed(status, area)) {
        if (status === "restricted") {
            throw new Error("支払遅延によりAPI機能が一時停止されています。決済情報を更新してください。");
        }
        if (status === "locked") {
            throw new Error("支払遅延により管理画面へのアクセスが制限されています。決済情報を更新してください。");
        }
        throw new Error("購読ステータスにより機能の利用が制限されています。");
    }
}
