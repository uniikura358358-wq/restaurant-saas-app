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
    type: 'image' | 'text';
    reason?: string;
}

// --- ユーティリティ ---

export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

export const AI_LIMITS: Record<string, number> = {
    'web Light': 0,
    'web Standard': 50,
    'web Pro': 200,
    'web Pro Premium': 450,
    // 互換性維持
    'Standard': 50,
    'Pro': 200,
    'Pro Premium': 450,
    'free': 0,
    'standard': 50,
    'premium': 450,
    'pro': 200,
    'default': 0
};

/** 内部予算リミット (テキスト生成月間上限: 非公開) */
export const INTERNAL_COST_LIMITS_YEN: Record<string, number> = {
    'web Light': 100,
    'web Standard': 650, // 微増して50/400回を確実にカバー
    'web Pro': 1800,
    'web Pro Premium': 3800, // 450/1700回を確実にカバー
    // 互換性維持
    'Standard': 650,
    'Pro': 1800,
    'Pro Premium': 3800,
    'free': 100,
    'standard': 650,
    'premium': 3800,
    'pro': 1800,
    'default': 100
};

/** 内部回数リミット (テキスト生成月間上限: 非公開) - 予算とは別に物理的な上限を設ける */
export const INTERNAL_TEXT_COUNT_LIMITS: Record<string, number> = {
    'web Light': 10,
    'web Standard': 400, // 500から調整: 予算650円内で画像50枚と両立
    'web Pro': 1000,
    'web Pro Premium': 1700, // 2000から調整: 予算3800円内で画像450枚と両立
    // 互換性維持
    'Standard': 400,
    'Pro': 1000,
    'Pro Premium': 1700,
    'free': 10,
    'standard': 400,
    'premium': 1700,
    'pro': 1000,
    'default': 10
};

/** AIテキスト生成の1回あたり想定コスト (円) - gemini-3-pro-preview (Thinking: LOW) 構成に合わせて調整 */
export const ESTIMATED_COST_PER_TEXT_CALL_YEN = 0.86;

export function getAiLimitByPlan(planName: string | null, type: 'image' | 'text' = 'image'): { budget?: number; count: number } {
    if (type === 'text') {
        const plan = planName || 'default';
        const budget = INTERNAL_COST_LIMITS_YEN[plan] || INTERNAL_COST_LIMITS_YEN['default'];
        const count = INTERNAL_TEXT_COUNT_LIMITS[plan] || INTERNAL_TEXT_COUNT_LIMITS['default'];
        return { budget, count };
    }
    const plan = planName || 'default';
    const count = AI_LIMITS[plan] || AI_LIMITS['default'];
    return { count };
}

// --- DB操作 ---

/**
 * AI利用状況をチェックする
 */
export async function checkAiQuota(
    storeId: string,
    planName: string | null,
    type: 'image' | 'text' = 'image'
): Promise<AiQuotaCheckResult> {
    const usageMonth = getCurrentMonth();

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

    const limits = getAiLimitByPlan(planName, type);
    const docSnap = await docRef.get();
    const data = docSnap.data();

    let allowed = true;
    let currentUsageValue = 0;
    let limitValue = 0;

    if (type === 'image') {
        currentUsageValue = data?.aiImageCount ?? 0;
        limitValue = limits.count;
        allowed = currentUsageValue < limitValue;
    } else {
        const currentCost = data?.aiTextCostYen ?? 0;
        const currentCount = data?.aiTextCount ?? 0;
        const costAllowed = currentCost < (limits.budget || 0);
        const countAllowed = currentCount < limits.count;
        allowed = costAllowed && countAllowed;
        currentUsageValue = currentCount; // ユーザーには回数を表示
        limitValue = limits.count || 0;
    }

    const summary: AiUsageSummary = {
        sent: currentUsageValue,
        limit: limitValue,
        remaining: Math.max(0, limitValue - currentUsageValue),
        usageMonth,
    };

    if (!allowed && limitValue > 0) {
        const msg = type === 'image'
            ? `AI画像生成の月間上限（${limitValue}回）に達しました。`
            : `AI利用制限に達しました。`;
        return {
            allowed: false,
            usage: summary,
            type,
            reason: msg,
        };
    }

    return { allowed: true, usage: summary, type };
}

/**
 * AI画像生成件数をインクリメントする
 */
export async function incrementAiUsage(
    storeId: string,
    type: 'image' | 'text' = 'image',
    costYen: number = ESTIMATED_COST_PER_TEXT_CALL_YEN
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
            const data = doc.exists ? doc.data() : {};

            if (type === 'image') {
                const currentCount = data?.aiImageCount || 0;
                t.set(docRef, {
                    aiImageCount: currentCount + 1,
                    updatedAt: new Date()
                }, { merge: true });
            } else {
                const currentCost = data?.aiTextCostYen || 0;
                const currentCount = data?.aiTextCount || 0;
                t.set(docRef, {
                    aiTextCostYen: currentCost + costYen,
                    aiTextCount: currentCount + 1,
                    updatedAt: new Date()
                }, { merge: true });
            }
        });
    } catch (error: any) {
        throw new Error(`AI利用件数の更新に失敗しました: ${error.message}`);
    }
}
