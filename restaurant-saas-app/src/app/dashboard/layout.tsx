"use client";

import { usePlanGuard } from "@/hooks/usePlanGuard";
import { LockScreen } from "@/components/LockScreen";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { showLockScreen, loading } = usePlanGuard();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="size-8 animate-spin text-primary/20" />
            </div>
        );
    }

    if (showLockScreen) {
        return <LockScreen />;
    }

    return <>{children}</>;
}
