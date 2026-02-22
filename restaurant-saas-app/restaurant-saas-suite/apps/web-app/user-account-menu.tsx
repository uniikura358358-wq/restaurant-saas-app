"use client";

import React, { useState } from "react";
import {
    User,
    Settings,
    HelpCircle,
    LayoutGrid,
    CreditCard,
    LogOut,
    ChevronRight,
    Copy,
    Check,
    ShieldCheck,
    Moon,
    Sun
} from "lucide-react";
import { useTheme } from "next-themes";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

interface UserAccountMenuProps {
    user: {
        uid: string;
        email: string | null;
        displayName: string | null;
    };
    stats: {
        planName?: string;
        nextPaymentDate?: Date | null;
    } | null;
    children?: React.ReactNode;
}

export function UserAccountMenu({ user, stats, children }: UserAccountMenuProps) {
    const router = useRouter();
    const [isCopied, setIsCopied] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const { theme, setTheme } = useTheme();

    const copyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setIsCopied(true);
        toast.success("ユーザーIDをコピーしました");
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleLogout = async () => {
        try {
            if (process.env.NODE_ENV === "development" && localStorage.getItem("demo_user") === "true") {
                localStorage.removeItem("demo_user");
                localStorage.removeItem("simulatedPlan");
            } else {
                await auth.signOut();
            }
            router.push("/login");
            toast.success("ログアウトしました");
        } catch (error) {
            toast.error("ログアウトに失敗しました");
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {children || (
                    <button className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
                        <Avatar className="size-10 border-2 border-background shadow-sm ring-2 ring-primary/10">
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-600 text-white font-bold">
                                {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 p-2 rounded-2xl shadow-xl border-border bg-card text-card-foreground" align="end" side="top">
                <DropdownMenuLabel className="font-normal px-2 pb-3">
                    <div className="text-xs font-bold text-muted-foreground mb-3 opacity-70">アカウント</div>
                    <div className="flex items-center justify-between group cursor-pointer hover:bg-muted p-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-12">
                                <AvatarFallback className="bg-cyan-500 text-white text-xl font-bold">
                                    {user.displayName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-bold text-base text-foreground leading-tight">
                                    {user.displayName || "ユーザー名未設定"}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                                    {user.email}
                                </span>
                            </div>
                        </div>
                        <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="mx-2 bg-border" />

                <div className="px-2 py-3 space-y-4">
                    {/* 会員プラン情報 */}
                    <div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 px-2 opacity-50">会員プラン</div>
                        <div className="flex items-center justify-between bg-muted p-3 rounded-xl border border-border">
                            <div className="flex flex-col">
                                <span className="font-black text-primary text-sm">{stats?.planName || "Light Plan"}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                    次回支払日: {stats?.nextPaymentDate ? stats.nextPaymentDate.toLocaleDateString('ja-JP') : "-"}
                                </span>
                            </div>
                            <Badge variant="outline" className="bg-card text-[10px] font-bold border-primary/20 text-primary">
                                契約中
                            </Badge>
                        </div>
                    </div>

                    {/* ユーザーID */}
                    <div className="group relative">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1 px-2 opacity-50">ユーザーID</div>
                        <div
                            onClick={() => copyId(user.uid)}
                            className="flex items-center justify-between text-[11px] font-mono bg-muted p-2 rounded-lg border border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors group"
                        >
                            <span className="text-muted-foreground truncate">{user.uid}</span>
                            {isCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />}
                        </div>
                    </div>

                    {/* 2FA Toggle */}
                    <div className="flex items-center justify-between px-2 py-1">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold flex items-center gap-1.5">
                                <ShieldCheck className="size-4 text-indigo-500" /> 2段階認証
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">セキュリティを強化</span>
                        </div>
                        <Switch
                            checked={twoFactorEnabled}
                            onCheckedChange={(val) => {
                                setTwoFactorEnabled(val);
                                if (val) toast.info("2段階認証の設定画面へ遷移します (仮実装)");
                            }}
                        />
                    </div>
                </div>

                <DropdownMenuSeparator className="mx-2 bg-border" />

                <div className="py-1">
                    <DropdownMenuItem
                        onClick={() => router.push('/settings/store')}
                        className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl mx-1 hover:bg-muted focus:bg-muted"
                    >
                        <Settings className="size-5 text-muted-foreground" />
                        <span className="font-bold text-sm text-foreground flex-1">店舗設定</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                    </DropdownMenuItem>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl mx-1 hover:bg-muted focus:bg-muted outline-none">
                                <Sun className="size-5 text-muted-foreground dark:hidden" />
                                <Moon className="size-5 text-muted-foreground hidden dark:block" />
                                <span className="font-bold text-sm text-foreground flex-1">テーマ</span>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full capitalize">
                                    {theme === 'system' ? 'システム' : theme === 'dark' ? 'ダーク' : 'ライト'}
                                </div>
                                <ChevronRight className="size-4 text-muted-foreground" />
                            </DropdownMenuItem>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start" className="w-32 p-1 rounded-xl shadow-lg border-border bg-card z-[100]">
                            <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-lg font-bold text-xs py-2">
                                ライト
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-lg font-bold text-xs py-2">
                                ダーク
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-lg font-bold text-xs py-2">
                                システム
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenuItem className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl mx-1 hover:bg-muted focus:bg-muted">
                        <HelpCircle className="size-5 text-muted-foreground" />
                        <span className="font-bold text-sm text-foreground flex-1">ヘルプと資料</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        onClick={() => router.push('/plans')}
                        className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl mx-1 hover:bg-muted focus:bg-muted"
                    >
                        <CreditCard className="size-5 text-muted-foreground" />
                        <span className="font-bold text-sm text-foreground flex-1">プランと価格</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                    </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="mx-2 bg-border" />

                <DropdownMenuItem
                    onClick={handleLogout}
                    className="gap-3 py-2.5 px-3 cursor-pointer rounded-xl mx-1 text-destructive hover:bg-destructive/5 focus:bg-destructive/5"
                >
                    <LogOut className="size-5" />
                    <span className="font-bold text-sm flex-1">ログアウト</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
