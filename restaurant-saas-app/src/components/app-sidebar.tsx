"use client";

import { MessageCircle, Store, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
    activePage: "dashboard" | "store" | "account";
}

export function AppSidebar({ activePage }: AppSidebarProps) {
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
            </nav>
            <div className="px-6 py-4 text-[10px] text-muted-foreground border-t opacity-50">
                Professional Edition v1.0
            </div>
        </aside>
    );
}
