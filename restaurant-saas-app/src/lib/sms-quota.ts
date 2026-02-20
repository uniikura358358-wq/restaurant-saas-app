/**
 * SMS送信クォータ管理モジュール (Firestore Version)
 *
 * stores/{uid}/usage/{YYYY-MM} ドキュメントと連携し、月間SMS送信数の管理を行う。
 */

import { adminDb, getDbForUser } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
    StoreUsageDoc,
    SmsUsageSummary,
    QuotaCheckResult,
    DEFAULT_SMS_LIMIT
} from "./sms-quota-shared";

export {
    type StoreUsageDoc,
    type SmsUsageSummary,
    type QuotaCheckResult,
    DEFAULT_SMS_LIMIT
};

// --- ユーティリティ ---

export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

// --- DB操作 ---

/**
 * 今月の利用レコードを取得する
 */
export async function getUsageRecord(
    storeId: string // in MVP, storeId = uid
): Promise<StoreUsageDoc> {
    const usageMonth = getCurrentMonth();
    const db = await getDbForUser(storeId);
    const docRef = db
        .collection("stores")
        .doc(storeId)
        .collection("usage")
        .doc(usageMonth);

    const doc = await docRef.get();

    if (doc.exists) {
        return doc.data() as StoreUsageDoc;
    }

    return {
        smsSentCount: 0,
        usageMonth,
        updatedAt: new Date()
    };
}

/**
 * SMS送信クォータをチェックする
 */
export async function checkSmsQuota(
    storeId: string,
    limitOverride: number = DEFAULT_SMS_LIMIT
): Promise<QuotaCheckResult> {
    const usage = await getUsageRecord(storeId);
    const limit = limitOverride;
    const sent = usage.smsSentCount || 0;
    const remaining = Math.max(0, limit - sent);

    const summary: SmsUsageSummary = {
        sent,
        limit,
        remaining,
        usageMonth: usage.usageMonth,
    };

    if (remaining <= 0) {
        return {
            allowed: false,
            usage: summary,
            reason: `SMS月間送信上限（${limit}件）に達しました。上位プランへのアップグレードで送信可能件数が増加します。`,
        };
    }

    return { allowed: true, usage: summary };
}

/**
 * SMS送信件数をアトミックにインクリメントする
 */
export async function incrementSmsCount(
    storeId: string
): Promise<number> {
    const usageMonth = getCurrentMonth();
    const db = await getDbForUser(storeId);
    const docRef = db
        .collection("stores")
        .doc(storeId)
        .collection("usage")
        .doc(usageMonth);

    await docRef.set({
        smsSentCount: FieldValue.increment(1),
        usageMonth: usageMonth,
        updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Read back to return updated count (optional, optimizing by assuming previous+1 or reading back)
    // For exactness we read back.
    const updatedDoc = await docRef.get();
    return (updatedDoc.data() as StoreUsageDoc)?.smsSentCount || 0;
}

/**
 * SMS利用状況サマリーを取得する（UI表示用）
 */
export async function getSmsUsageSummary(
    storeId: string,
    limitOverride: number = DEFAULT_SMS_LIMIT
): Promise<SmsUsageSummary> {
    const usage = await getUsageRecord(storeId);

    return {
        sent: usage.smsSentCount || 0,
        limit: limitOverride,
        remaining: Math.max(0, limitOverride - (usage.smsSentCount || 0)),
        usageMonth: usage.usageMonth,
    };
}
