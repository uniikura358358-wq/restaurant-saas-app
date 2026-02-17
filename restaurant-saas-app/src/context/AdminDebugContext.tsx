'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type SimulatedPlan = 'Free' | 'Light' | 'Standard' | 'Premium' | null;

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
        } else {
            localStorage.removeItem('simulatedPlan');
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
