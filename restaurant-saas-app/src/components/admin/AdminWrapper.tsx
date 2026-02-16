'use client';

import { useAuth } from '@/hooks/useAuth';
import { AdminDebugProvider } from '@/context/AdminDebugContext';
import { AdminToolbar } from '@/components/admin/AdminToolbar';

export function AdminWrapper({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    return (
        <AdminDebugProvider currentUserId={user?.uid}>
            {children}
            <AdminToolbar />
        </AdminDebugProvider>
    );
}
