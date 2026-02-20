import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAdminDebug } from '@/context/AdminDebugContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, disableNetwork } from 'firebase/firestore';

/** 
 * プラン名の定数定義 (表記ゆれ・タイポ防止)
 */
export const PLAN_NAMES = {
    STANDARD: 'Standard',
    PRO: 'Pro',
    PREMIUM: 'Pro Premium',
    WEB_STANDARD: 'web Standard',
    WEB_PRO: 'web Pro',
    WEB_PREMIUM: 'web Pro Premium',
    // 旧名称 'web Light' は削除済み
} as const;

export type PlanLevel = typeof PLAN_NAMES[keyof typeof PLAN_NAMES];

export function usePlanGuard() {
    const { user, loading: authLoading } = useAuth();
    const [planName, setPlanName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const { simulatedPlan } = useAdminDebug();

    // effectivePlanName は常に simulatedPlan を最優先する
    const effectivePlanName = simulatedPlan || planName;

    const fetchPlan = useCallback(async (isRefresh = false) => {
        if (!user) return;

        // デモユーザーまたは localStorage でデモ設定がある場合は Firestore 通信を完全に回避
        const isDemo = user.uid === "demo-user-id" || (typeof window !== 'undefined' && (localStorage.getItem('demo_user') === 'true' || localStorage.getItem('is_demo_mode') === 'true'));

        if (isDemo) {
            // デモユーザーの場合でも、simulatedPlan が設定されていればそれを優先する
            if (simulatedPlan) {
                setPlanName(simulatedPlan);
            } else {
                setPlanName(PLAN_NAMES.STANDARD); // デフォルトのデモプランを 'Standard' に変更
            }
            setLoading(false);
            disableNetwork(db).catch(() => { });
            return;
        }

        if (isRefresh) setLoading(true);

        // simulatedPlan が設定されている場合は、Firestore から実際のプランを取得しない
        if (simulatedPlan && !isRefresh) {
            setPlanName(simulatedPlan);
            setLoading(false);
            return;
        }

        try {
            if (!db) throw new Error("Firestore is not initialized");

            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                const rawPlan = data.plan || data.planName || PLAN_NAMES.WEB_STANDARD; // デフォルトを 'web Standard' に変更
                // 旧名称 'Free' / 'free' / 'WEB会員' を 'web Light' ではなく 'web Standard' に正規化（'web Light'削除に伴い）
                const normalizedPlan = (typeof rawPlan === 'string' && (rawPlan.toLowerCase() === 'free' || rawPlan === 'WEB会員' || rawPlan.toLowerCase() === 'web light')) ? PLAN_NAMES.WEB_STANDARD : rawPlan;
                setPlanName(normalizedPlan);
            } else {
                console.log('No profile found for user:', user.uid);
                setPlanName(PLAN_NAMES.WEB_STANDARD); // デフォルトを 'web Standard' に変更
            }
        } catch (err: any) {
            console.error('Plan fetch error (falling back to web Standard):', err);
            setPlanName(PLAN_NAMES.WEB_STANDARD); // デフォルトを 'web Standard' に変更
        } finally {
            setLoading(false);
        }
    }, [user, simulatedPlan]); // simulatedPlan を依存配列に追加

    useEffect(() => {
        const isDemo = typeof window !== 'undefined' &&
            (localStorage.getItem('demo_user') === 'true' || localStorage.getItem('is_demo_mode') === 'true');

        if (isDemo) {
            // ここでの setPlanName は、simulatedPlan が優先されるため不要になるか、
            // あるいは simulatedPlan が設定されていない場合のフォールバックとして機能する
            // fetchPlan 内で既に処理されるため、このブロックは簡素化できる
        }

        if (!authLoading && user) {
            fetchPlan();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading, fetchPlan, simulatedPlan]); // simulatedPlan を依存配列に追加

    const hasFeature = (feature: 'instagram' | 'ai_pop' | 'priority_support') => {
        if (!effectivePlanName) return false;

        const plan = effectivePlanName.toLowerCase();
        const isPro = plan.includes('pro');
        const isPremium = plan.includes('premium');

        switch (feature) {
            case 'instagram':
                // Pro以上で許可（webの有無を問わない）
                return isPro || isPremium;
            case 'ai_pop':
                // Pro以上で許可
                return isPro || isPremium;
            case 'priority_support':
                // Premiumのみ
                return isPremium;
            default:
                return false;
        }
    };

    const isWebPlan = effectivePlanName ? (
        effectivePlanName.toLowerCase().startsWith('web') ||
        effectivePlanName === 'WEB会員'
    ) : false;

    return {
        planName: effectivePlanName,
        realPlanName: planName,
        loading: loading || authLoading,
        hasFeature,
        isWebPlan,
        refreshPlan: () => fetchPlan(true)
    };
}
