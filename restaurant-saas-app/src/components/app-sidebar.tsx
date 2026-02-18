"use client";

import Link from "next/link";
import { usePlanGuard } from "@/hooks/usePlanGuard";
import { cn } from "@/lib/utils";
import {
    MessageCircle,
    Store,
    User,
    ChevronUp,
    Layout
} from "lucide-react";
import { UserAccountMenu } from "./user-account-menu";
import { AnnouncementList } from "./announcement-list";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
    activePage: "dashboard" | "store" | "account" | "plans" | "hp" | "settings";
    user?: any;
    stats?: any;
    announcements?: any[];
}

export function AppSidebar({ activePage, user, stats, announcements = [] }: AppSidebarProps) {
    const { isWebPlan } = usePlanGuard();

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

            <nav className="flex-1 px-3 py-4 space-y-1">
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
                    <span>口コミ一覧</span>
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
                                        {stats?.planName || "LITE"}
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
