'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminDebug } from '@/context/AdminDebugContext';
import { usePlanGuard, PLAN_NAMES } from '@/hooks/usePlanGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ExternalLink, ShieldCheck, ChevronUp, ChevronDown, Check } from 'lucide-react';

const QUICK_LINKS = [
    { label: 'Dashbord', path: '/dashboard' },
    { label: 'Store Settings', path: '/settings/store' },
    { label: 'Instagram', path: '/tools/instagram' },
    { label: 'Website Materials', path: '/tools/materials' },
    { label: 'Plans', path: '/plans' },
];

export function AdminToolbar() {
    const { isAdmin, simulatedPlan, setSimulatedPlan } = useAdminDebug();
    const { realPlanName } = usePlanGuard();
    const [isExpanded, setIsExpanded] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    if (!isAdmin) return null;

    const planOptions = [
        { label: 'Real', value: null },
        { label: 'Free', value: 'Free' },
        { label: 'Light', value: 'Light' },
        { label: 'Standard', value: 'Standard' },
        { label: 'Business', value: 'Business' },
    ] as const;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] font-mono select-none">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-3 w-64 bg-black/90 text-green-400 border border-green-500/50 rounded-xl shadow-2xl p-4 backdrop-blur-md"
                    >
                        <div className="flex items-center gap-2 mb-4 border-b border-green-500/30 pb-2">
                            <ShieldCheck className="w-4 h-4 text-green-500 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider">Admin Debug Console</span>
                        </div>

                        {/* Plan Masquerading */}
                        <div className="mb-4">
                            <p className="text-[10px] uppercase text-green-500/60 mb-2 font-black">Plan Masquerading</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {planOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        onClick={() => setSimulatedPlan(opt.value)}
                                        className={`text-[11px] px-2 py-1.5 rounded border transition-all flex items-center justify-between ${simulatedPlan === opt.value
                                                ? 'bg-green-500 text-black border-transparent font-bold'
                                                : 'bg-green-500/5 border-green-500/30 hover:bg-green-500/20'
                                            }`}
                                    >
                                        {opt.label}
                                        {simulatedPlan === opt.value && <Check className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-[10px] text-green-500/40 italic">
                                Real Plan: {realPlanName || 'Unknown'}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="mb-2">
                            <p className="text-[10px] uppercase text-green-500/60 mb-2 font-black">Quick Navigation</p>
                            <div className="space-y-1">
                                {QUICK_LINKS.map((link) => (
                                    <button
                                        key={link.path}
                                        onClick={() => {
                                            router.push(link.path);
                                            // Optional: close on navigate
                                        }}
                                        className={`w-full text-left text-[11px] px-2 py-1.5 rounded flex items-center justify-between transition-all ${pathname === link.path
                                                ? 'bg-green-500/20 border-l-2 border-green-500'
                                                : 'hover:bg-green-500/10'
                                            }`}
                                    >
                                        {link.label}
                                        <ExternalLink className="w-2.5 h-2.5 opacity-40" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {simulatedPlan && (
                            <div className="mt-4 pt-2 border-t border-green-500/30 text-[10px] font-bold text-center animate-pulse text-yellow-500">
                                ⚠ MOCK MODE: {simulatedPlan.toUpperCase()}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border transition-all ${isExpanded
                        ? 'bg-green-500 text-black border-transparent scale-95'
                        : simulatedPlan
                            ? 'bg-black text-yellow-500 border-yellow-500 animate-pulse'
                            : 'bg-black text-green-500 border-green-500 hover:scale-105'
                    }`}
            >
                <Settings className={`w-4 h-4 ${isExpanded ? 'rotate-90' : ''} transition-transform`} />
                <span className="text-xs font-bold uppercase tracking-widest">
                    {simulatedPlan ? `Masq: ${simulatedPlan}` : 'Dev Tool'}
                </span>
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            </button>
        </div>
    );
}
