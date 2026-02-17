import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAdminDebug } from '@/context/AdminDebugContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, disableNetwork } from 'firebase/firestore';

/** 
 * プラン名の定数定義 (表記ゆれ・タイポ防止)
 */
export const PLAN_NAMES = {
    FREE: 'Free',
    LIGHT: 'Light',
    STANDARD: 'Standard',
    PREMIUM: 'Premium'
} as const;

export type PlanLevel = typeof PLAN_NAMES[keyof typeof PLAN_NAMES];

export function usePlanGuard() {
    const { user, loading: authLoading } = useAuth();
    const [planName, setPlanName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { simulatedPlan } = useAdminDebug();

    const effectivePlanName = simulatedPlan || planName;

    const fetchPlan = useCallback(async (isRefresh = false) => {
        if (!user) return;

        // デモユーザーまたは localStorage でデモ設定がある場合は Firestore 通信を完全に回避
        const isDemo = user.uid === "demo-user-id" || (typeof window !== 'undefined' && (localStorage.getItem('demo_user') === 'true' || localStorage.getItem('is_demo_mode') === 'true'));

        if (isDemo) {
            setPlanName(PLAN_NAMES.STANDARD);
            setLoading(false);
            // 念押しでネットワーク切断を実行
            disableNetwork(db).catch(() => { });
            return;
        }

        if (isRefresh) setLoading(true);

        try {
            // Firestore: users/{uid} からプラン情報を取得
            // 念のため db が初期化されているか、オフラインエラーが致命的にならないかを確認
            if (!db) throw new Error("Firestore is not initialized");

            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setPlanName(data.plan || data.planName || 'Free');
            } else {
                console.log('No profile found for user:', user.uid);
                setPlanName('Free');
            }
        } catch (err: any) {
            console.error('Plan fetch error (falling back to Free):', err);
            // オフラインエラーや権限不足時は Free として扱う
            setPlanName('Free');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        // user 読み込み前でも localStorage でデモモードと分かっていれば即座に確定
        const isDemo = typeof window !== 'undefined' &&
            (localStorage.getItem('demo_user') === 'true' || localStorage.getItem('is_demo_mode') === 'true');

        if (isDemo) {
            setPlanName(PLAN_NAMES.STANDARD);
            setLoading(false);
            // 念押し
            disableNetwork(db).catch(() => { });
            return;
        }

        if (!authLoading && user) {
            fetchPlan();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading, fetchPlan]);

    const hasFeature = (feature: 'instagram' | 'ai_pop' | 'priority_support') => {
        if (!effectivePlanName) return false;

        const plan = effectivePlanName.toLowerCase();

        switch (feature) {
            case 'instagram':
                // Standard以上で許可
                return [
                    PLAN_NAMES.STANDARD.toLowerCase(),
                    PLAN_NAMES.PREMIUM.toLowerCase()
                ].includes(plan);
            case 'ai_pop':
                // Premiumのみ
                return [
                    PLAN_NAMES.PREMIUM.toLowerCase()
                ].includes(plan);
            case 'priority_support':
                // Premiumのみ
                return [
                    PLAN_NAMES.PREMIUM.toLowerCase()
                ].includes(plan);
            default:
                return false;
        }
    };

    return {
        planName: effectivePlanName,
        realPlanName: planName,
        loading: loading || authLoading,
        hasFeature,
        refreshPlan: () => fetchPlan(true)
    };
}
