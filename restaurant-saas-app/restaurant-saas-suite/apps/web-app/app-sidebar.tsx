"use client";

import Link from "next/link";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { cn } from "@/lib/utils";
import {
    MessageCircle,
    Store,
    User,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Layout,
    Sparkles,
    TrendingUp
} from "lucide-react";
import { UserAccountMenu } from "./user-account-menu";
import { AnnouncementList } from "./announcement-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
    activePage: "dashboard" | "store" | "account" | "plans" | "hp" | "settings" | "pop" | "accounting";
    activeSubPage?: string;
    onSubPageChange?: (page: string) => void;
    user?: any;
    stats?: any;
    announcements?: any[];
}

export function AppSidebar({ activePage, activeSubPage, onSubPageChange, user, stats, announcements = [] }: AppSidebarProps) {
    const { isWebPlan, planName: guardPlanName } = usePlanGuard();

    return (
        <aside className="hidden md:flex w-64 border-r bg-sidebar text-sidebar-foreground flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-6 py-5 border-b">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-lg">
                        <MessageCircle className="size-5 text-primary" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Review AI</span>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <Link
                    href="/dashboard"
                    className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        activePage === "dashboard"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <MessageCircle className="size-4" />
                    <span className="flex-1">口コミ一覧</span>
                    {stats?.unrepliedCount > 0 && (
                        <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse shadow-sm">
                            未返信 {stats.unrepliedCount}件
                        </span>
                    )}
                </Link>
                <Link
                    href="/settings/store"
                    className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        activePage === "store"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Store className="size-4" />
                    <span>店舗設定</span>
                </Link>

                {/* 経営・事務管理 (2段階メニュー) */}
                <div className="space-y-1">
                    <Link
                        href="/dashboard/accounting"
                        className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors group",
                            activePage === "accounting"
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <TrendingUp className="size-4 text-emerald-500" />
                        <span className="flex-1">経営・事務管理</span>
                        {activePage === "accounting" ? (
                            <ChevronDown className="size-3.5 opacity-50" />
                        ) : (
                            <ChevronRight className="size-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
                        )}
                    </Link>

                    {/* サブメニュー */}
                    {activePage === "accounting" && (
                        <div className="ml-7 space-y-1 pb-2">
                            {[
                                { id: "overview", label: "概要" },
                                { id: "sales", label: "売上管理" },
                                { id: "finance", label: "収支・帳簿" },
                                { id: "documents", label: "書類管理" }
                            ].map((sub) => (
                                <button
                                    key={sub.id}
                                    onClick={() => onSubPageChange?.(sub.id)}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-[13px] font-medium rounded-md transition-all flex items-center gap-2",
                                        activeSubPage === sub.id
                                            ? "text-primary bg-primary/5"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    )}
                                >
                                    <div className={cn(
                                        "size-1 rounded-full transition-all",
                                        activeSubPage === sub.id ? "bg-primary scale-125" : "bg-muted-foreground/30"
                                    )} />
                                    {sub.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <Link
                    href="/dashboard/tools/pop-maker"
                    className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        activePage === "pop"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <Sparkles className="size-4 text-amber-500" />
                    <span>AI POP作成</span>
                </Link>
                <Link
                    href="/settings/account"
                    className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        activePage === "account"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                >
                    <User className="size-4" />
                    <span>アカウント設定</span>
                </Link>

                {isWebPlan && (
                    <Link
                        href="/settings/store/website-materials"
                        className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            activePage === "hp"
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        <Layout className="size-4" />
                        <span>HPコンテンツ管理</span>
                    </Link>
                )}


                <div className="pt-4 mt-4 border-t border-dashed border-border px-3">
                    <Link
                        href="/plans"
                        className={cn(
                            "flex w-full items-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition-all shadow-sm hover:shadow-md",
                            activePage === "plans"
                                ? "bg-primary text-white"
                                : "bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 hover:from-orange-100 hover:to-red-100 border border-orange-100 dark:from-orange-950/20 dark:to-red-950/20 dark:text-orange-400 dark:border-orange-900/30"
                        )}
                    >
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-[10px] text-white font-black shadow-sm">
                            UP
                        </span>
                        <span>プランの管理</span>
                    </Link>
                </div>
            </nav>

            <div className="p-4 border-t space-y-3 bg-muted/5">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-1">
                        <AnnouncementList announcements={announcements} />
                        <span className="text-[10px] font-bold text-muted-foreground">お知らせ</span>
                    </div>
                </div>

                {user && (
                    <UserAccountMenu user={user} stats={stats}>
                        <div className="bg-card p-3 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all flex items-center justify-between cursor-pointer group hover:bg-muted">
                            <div className="flex items-center gap-3 overflow-hidden ml-1">
                                <div className="relative">
                                    <Avatar className="size-11 border-2 border-background shadow-sm ring-2 ring-primary/10 transition-transform group-hover:scale-105">
                                        <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white font-bold">
                                            {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-0.5 -right-0.5 size-3.5 bg-emerald-500 border-2 border-background rounded-full" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-foreground truncate tracking-tight group-hover:text-primary transition-colors">
                                        {user.displayName || user.email?.split('@')[0]}
                                    </span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-0.5">
                                        {guardPlanName || "LITE"}
                                    </span>
                                </div>
                            </div>
                            <div className="p-1.5 text-muted-foreground group-hover:text-foreground transition-colors">
                                <ChevronUp className="size-5" />
                            </div>
                        </div>
                    </UserAccountMenu>
                )}

                <div className="px-2 pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground/40">Edition v1.0</span>
                    <div className="flex gap-1.5 items-center">
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-600/60 uppercase">System Active</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
