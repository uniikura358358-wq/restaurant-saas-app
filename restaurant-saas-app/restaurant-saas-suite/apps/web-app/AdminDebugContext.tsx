'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type SimulatedPlan = 'web Light' | 'web Standard' | 'web Pro' | 'web Pro Premium' | 'Standard' | 'Pro' | 'Pro Premium' | null;

interface AdminDebugContextType {
    simulatedPlan: SimulatedPlan;
    setSimulatedPlan: (plan: SimulatedPlan) => void;
    isAdmin: boolean;
}

const AdminDebugContext = createContext<AdminDebugContextType | undefined>(undefined);

export function AdminDebugProvider({ children, currentUserId }: { children: React.ReactNode, currentUserId?: string }) {
    const [simulatedPlan, setSimulatedPlanState] = useState<SimulatedPlan>(null);
    const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
    const isAdmin = !!currentUserId && (currentUserId === adminId || currentUserId === 'demo-user-id');

    // Load from localStorage on mount
    useEffect(() => {
        if (isAdmin) {
            const savedPlan = localStorage.getItem('simulatedPlan') as SimulatedPlan;
            if (savedPlan) setSimulatedPlanState(savedPlan);
        }
    }, [isAdmin]);

    const setSimulatedPlan = (plan: SimulatedPlan) => {
        setSimulatedPlanState(plan);
        if (plan) {
            localStorage.setItem('simulatedPlan', plan);
            // Cookie にも保存してサーバー側 (Server Actions) で読み取れるようにする
            document.cookie = `simulated_plan=${encodeURIComponent(plan)}; path=/; max-age=${60 * 60 * 24}`;
        } else {
            localStorage.removeItem('simulatedPlan');
            document.cookie = `simulated_plan=; path=/; max-age=0`;
        }
    };

    return (
        <AdminDebugContext.Provider value={{ simulatedPlan, setSimulatedPlan, isAdmin }}>
            {children}
        </AdminDebugContext.Provider>
    );
}

export function useAdminDebug() {
    const context = useContext(AdminDebugContext);
    if (context === undefined) {
        // Fallback for non-admin or outside provider
        return { simulatedPlan: null, setSimulatedPlan: () => { }, isAdmin: false };
    }
    return context;
}
