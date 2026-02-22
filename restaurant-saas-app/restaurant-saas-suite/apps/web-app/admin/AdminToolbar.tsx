
'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminDebug } from '@/context/AdminDebugContext';
import { usePlanGuard, PLAN_NAMES } from '@/hooks/usePlanGuard';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ExternalLink, ShieldCheck, ChevronUp, ChevronDown, Check } from 'lucide-react';

const QUICK_LINKS = [
    { label: 'Dashboard', path: '/dashboard' },
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
        { label: 'Standard', value: 'Standard' },
        { label: 'Pro', value: 'Pro' },
        { label: 'Pro Premium', value: 'Pro Premium' },
        { label: 'web Standard', value: 'web Standard' },
        { label: 'web Pro', value: 'web Pro' },
        { label: 'web Pro Premium', value: 'web Pro Premium' },
    ] as const;

    return (
        <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            className="fixed z-[9999] font-mono select-none flex flex-col items-center"
            style={{
                left: '50%',
                bottom: '120px',
                x: '-50%',
                cursor: 'grab'
            }}
            whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
        >
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="mb-3 w-64 bg-black/80 hover:bg-black/95 text-green-400 border border-green-500/50 rounded-2xl shadow-2xl p-4 backdrop-blur-xl transition-colors duration-300"
                    >
                        <div className="flex items-center justify-between mb-4 border-b border-green-500/30 pb-2">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-green-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-green-500/80">Admin Console</span>
                            </div>
                            <span className="text-[8px] opacity-40 font-bold">DRAGGABLE</span>
                        </div>

                        {/* Plan Masquerading */}
                        <div className="mb-4">
                            <p className="text-[9px] uppercase text-green-500/40 mb-2 font-black">Plan Mask</p>
                            <div className="grid grid-cols-2 gap-1">
                                {planOptions.map((opt) => (
                                    <button
                                        key={opt.label}
                                        onClick={() => setSimulatedPlan(opt.value)}
                                        className={`text-[10px] px-2 py-1.5 rounded-lg border transition-all flex items-center justify-between ${simulatedPlan === opt.value
                                            ? 'bg-green-500 text-black border-transparent font-bold'
                                            : 'bg-green-500/5 border-green-500/20 hover:bg-green-500/20'
                                            } ${realPlanName === opt.value ? 'ring-1 ring-green-500 ring-offset-1 ring-offset-black' : ''}`}
                                    >
                                        <span className="flex items-center gap-1">
                                            {opt.label}
                                            {realPlanName === opt.value && (
                                                <span className={`text-[7px] px-1 py-0.5 rounded ${simulatedPlan === opt.value ? 'bg-black/20' : 'bg-green-500/20'}`}>
                                                    REAL
                                                </span>
                                            )}
                                        </span>
                                        {simulatedPlan === opt.value && <Check className="w-2.5 h-2.5" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="mb-2">
                            <p className="text-[9px] uppercase text-green-500/40 mb-2 font-black">Navigation</p>
                            <div className="grid grid-cols-1 gap-1">
                                {QUICK_LINKS.map((link) => (
                                    <button
                                        key={link.path}
                                        onClick={() => router.push(link.path)}
                                        className={`w-full text-left text-[10px] px-2 py-1.5 rounded-lg flex items-center justify-between transition-all ${pathname === link.path
                                            ? 'bg-green-500/20 border-l-2 border-green-500'
                                            : 'hover:bg-green-500/10'
                                            }`}
                                    >
                                        {link.label}
                                        <ExternalLink className="w-2.5 h-2.5 opacity-30" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {simulatedPlan && (
                            <div className="mt-3 pt-2 border-t border-green-500/20 text-[9px] font-black text-center animate-pulse text-yellow-500">
                                ⚠ MOCK: {simulatedPlan.toUpperCase()}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`group flex items-center gap-2 px-5 py-2.5 rounded-full shadow-2xl border-2 transition-all active:scale-90 ${isExpanded
                    ? 'bg-green-500 text-black border-green-400'
                    : simulatedPlan
                        ? 'bg-black/90 text-yellow-500 border-yellow-500 animate-pulse'
                        : 'bg-black/80 text-green-500 border-green-500/50 hover:bg-black hover:border-green-500'
                    }`}
            >
                <div className="relative">
                    <Settings className={`w-4 h-4 ${isExpanded ? 'rotate-90' : 'group-hover:rotate-45'} transition-transform duration-500`} />
                    {!isExpanded && simulatedPlan && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-ping" />
                    )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {simulatedPlan && !isExpanded ? `MOD: ${simulatedPlan}` : 'Dev Tool'}
                </span>
                {isExpanded ? <ChevronDown className="w-3 h-3 opacity-50" /> : <ChevronUp className="w-3 h-3 opacity-50" />}
            </button>
        </motion.div>
    );
}
