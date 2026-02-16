import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAdminDebug } from '@/context/AdminDebugContext';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/** 
 * プラン名の定数定義 (表記ゆれ・タイポ防止)
 */
export const PLAN_NAMES = {
    FREE: 'Free',
    LIGHT: 'Light',
    STANDARD: 'Standard',
    BUSINESS: 'Business',
    PREMIUM: 'Premium',
    PRO: 'Pro'
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

        if (isRefresh) setLoading(true);

        try {
            // Firestore: users/{uid} からプラン情報を取得
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // 以前のSupabase互換のため 'plan_name' または 'plan' を確認
                setPlanName(data.plan || data.planName || 'Free');
            } else {
                console.log('No profile found for user:', user.uid);
                setPlanName('Free'); // Default to Free
            }
        } catch (err) {
            console.error('Unexpected error fetching plan:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
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
                // Standard以上、またはBusiness以上で許可
                return [
                    PLAN_NAMES.STANDARD.toLowerCase(),
                    PLAN_NAMES.BUSINESS.toLowerCase(),
                    PLAN_NAMES.PREMIUM.toLowerCase(),
                    PLAN_NAMES.PRO.toLowerCase()
                ].includes(plan);
            case 'ai_pop':
                return [
                    PLAN_NAMES.PREMIUM.toLowerCase(),
                    PLAN_NAMES.PRO.toLowerCase()
                ].includes(plan);
            case 'priority_support':
                return [
                    PLAN_NAMES.PREMIUM.toLowerCase(),
                    PLAN_NAMES.PRO.toLowerCase()
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
