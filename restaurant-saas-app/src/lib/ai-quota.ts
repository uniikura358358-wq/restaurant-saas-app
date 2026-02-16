/**
 * AI利用クォータ管理モジュール
 * 
 * store_usage コレクションと連携し、月間AI画像生成数の管理を行う。
 * プランに応じたハードリミット (30/60/90) を適用する。
 */

import { adminDb } from "@/lib/firebase-admin";

// --- 型定義 ---

/** AI利用状況サマリー */
export interface AiUsageSummary {
    sent: number;
    limit: number;
    remaining: number;
    usageMonth: string;
}

/** クォータチェック結果 */
export interface AiQuotaCheckResult {
    allowed: boolean;
    usage: AiUsageSummary;
    reason?: string;
}

// --- ユーティリティ ---

export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

/** プラン別AI画像生成上限 (最終確定仕様) */
export const AI_LIMITS: Record<string, number> = {
    'Light Plan': 30,
    'Standard Plan': 60,
    'Premium Plan': 90,
    'default': 0
};

export function getAiLimitByPlan(planName: string | null): number {
    if (!planName) return AI_LIMITS['default'];
    return AI_LIMITS[planName] || AI_LIMITS['default'];
}

// --- DB操作 ---

/**
 * AI利用状況をチェックする
 */
export async function checkAiQuota(
    storeId: string,
    planName: string | null
): Promise<AiQuotaCheckResult> {
    const usageMonth = getCurrentMonth();
    const limit = getAiLimitByPlan(planName);

    // stores/{storeId}/usage/{usageMonth} または store_usage/{storeId_usageMonth}
    // ここでは単純化のため store_usage/{storeId}_{usageMonth} ドキュメントを使用するか、
    // あるいは `stores/{storeId}/stats/ai_usage` のようにサブコレクションにするか。
    // 既存の実装に合わせて `store_usage` というルートコレクションを想定（あるいは `stores` のサブコレクション推奨だが、移行コストを抑えるためルートコレクションで実装）
    // Firestore設計原則的には `stores/{storeId}/monthly_usage/{usageMonth}` が望ましい。
    // 今回は `stores/{storeId}/monthly_usage/{usageMonth}` を採用する。

    const docRef = adminDb
        .collection("stores")
        .doc(storeId)
        .collection("monthly_usage")
        .doc(usageMonth);

    const docSnap = await docRef.get();
    const data = docSnap.data();

    const sent = data?.aiImageCount ?? 0;
    const remaining = Math.max(0, limit - sent);

    const summary: AiUsageSummary = {
        sent,
        limit,
        remaining,
        usageMonth,
    };

    if (remaining <= 0 && limit > 0) {
        return {
            allowed: false,
            usage: summary,
            reason: `AI画像生成の月間上限（${limit}回）に達しました。翌月までお待ちいただくか、プランのアップグレードをご検討ください。`,
        };
    }

    return { allowed: true, usage: summary };
}

/**
 * AI画像生成件数をインクリメントする
 */
export async function incrementAiCount(
    storeId: string
): Promise<void> {
    const usageMonth = getCurrentMonth();

    const docRef = adminDb
        .collection("stores")
        .doc(storeId)
        .collection("monthly_usage")
        .doc(usageMonth);

    try {
        await adminDb.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            const currentCount = doc.exists ? (doc.data()?.aiImageCount || 0) : 0;

            t.set(docRef, {
                aiImageCount: currentCount + 1,
                updatedAt: new Date()
            }, { merge: true });
        });
    } catch (error: any) {
        throw new Error(`AI利用件数の更新に失敗しました: ${error.message}`);
    }
}
