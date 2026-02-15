"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import {
    User,
    Loader2,
    LogOut,
    Mail,
    Phone,
    CheckCircle2,
    BellRing,
    ShieldCheck,
    ArrowRight,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/app-sidebar";
import {
    DEFAULT_NOTIFICATION_CONFIG,
    type NotificationConfig,
} from "@/lib/notification-handler";
import { getSmsUsageSummary, DEFAULT_SMS_LIMIT, type SmsUsageSummary } from "@/lib/sms-quota";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
// ... imports ...

export default function AccountSettingsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="flex h-screen max-h-screen">
                <AppSidebar activePage="account" />
                <main className="flex-1 overflow-y-auto">
                    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>}>
                        <AccountSettingsContent />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}

function AccountSettingsContent() {
    const searchParams = useSearchParams();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Notification State
    const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>(DEFAULT_NOTIFICATION_CONFIG);
    const [userEmail, setUserEmail] = useState("");
    const [sendingVerification, setSendingVerification] = useState<"email" | "sms" | null>(null);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    // SMS Usage State
    const [smsUsage, setSmsUsage] = useState<SmsUsageSummary>({
        sent: 0,
        limit: DEFAULT_SMS_LIMIT,
        remaining: DEFAULT_SMS_LIMIT,
        usageMonth: "",
    });

    // ユーザー情報を取得
    const fetchUser = useCallback(async () => {
        const supabase = createClient();
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
            setUser(data.user);
        }
    }, []);

    // SMS利用状況を取得
    const fetchSmsUsage = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user) return;

            const { data: storeSettings, error: settingsError } = await supabase
                .from("store_settings")
                .select("id, sms_limit_override")
                .eq("user_id", authData.user.id)
                .limit(1)
                .maybeSingle();

            if (settingsError || !storeSettings?.id) return;

            const limitOverride = storeSettings.sms_limit_override ?? DEFAULT_SMS_LIMIT;
            const summary = await getSmsUsageSummary(supabase, storeSettings.id, limitOverride);
            setSmsUsage(summary);
        } catch {
            // Error handled by fallback
        }
    }, []);

    // 設定を取得
    const fetchConfig = useCallback(async () => {
        try {
            const response = await fetch("/api/settings/get", { cache: "no-store" });
            if (!response.ok) throw new Error("設定の取得に失敗しました");
            const data = await response.json();

            if (data.user_email) setUserEmail(data.user_email);

            if (data.notification_config) {
                setNotificationConfig({ ...DEFAULT_NOTIFICATION_CONFIG, ...data.notification_config });
            }
            if (data.sms_usage) setSmsUsage(data.sms_usage); // APIからも取得

        } catch (error) {
            toast.error(error instanceof Error ? error.message : "設定の取得に失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
        fetchConfig();
        fetchSmsUsage();
    }, [fetchUser, fetchConfig, fetchSmsUsage]);

    // URLパラメータの確認完了トースト
    useEffect(() => {
        const verified = searchParams.get("verified");
        const verifyError = searchParams.get("verify_error");
        const success = searchParams.get("success");

        if (verified === "email") toast.success("メールアドレスが確認されました ✅");
        else if (verified === "sms") toast.success("電話番号が確認されました ✅");

        if (success === "true") {
            toast.success("プランのアップグレードが完了しました！ 🎉", {
                description: "すべての機能をご利用いただけます。ありがとうございます！",
                duration: 8000,
            });
        }

        if (verifyError === "expired_token") toast.error("確認リンクの有効期限が切れています。");
        else if (verifyError === "invalid_token") toast.error("確認リンクが無効です。");
    }, [searchParams]);

    // ログアウト処理
    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    // 保存処理 (Notification Config Only)
    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch("/api/settings/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    notification_config: notificationConfig
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "設定の保存に失敗しました");
            }
            toast.success("設定を保存しました");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "設定の保存に失敗しました");
        } finally {
            setSaving(false);
        }
    };

    // Notification Logic
    const updateNotification = (patch: Partial<NotificationConfig>) => {
        setNotificationConfig((prev) => ({ ...prev, ...patch }));
    };

    const toggleTargetStar = (star: number) => {
        setNotificationConfig((prev) => {
            const current = prev.target_stars;
            const next = current.includes(star)
                ? current.filter((s) => s !== star)
                : [...current, star].sort();
            return { ...prev, target_stars: next };
        });
    };

    const handleEmailToggle = (checked: boolean) => {
        if (checked && userEmail) {
            updateNotification({
                email_enabled: true,
                email_address: userEmail,
                email_verified: true,
            });
        } else {
            updateNotification({ email_enabled: checked });
        }
    };

    const handleEmailChange = (value: string) => {
        const isDefault = value === userEmail;
        updateNotification({ email_address: value, email_verified: isDefault });
    };

    const handleSmsToggle = (checked: boolean) => {
        updateNotification({ sms_enabled: checked });
        if (!checked) {
            setShowOtpInput(false);
            setOtpCode("");
        }
    };

    const sendVerification = async (channel: "email" | "sms") => {
        const contactValue = channel === "email"
            ? notificationConfig.email_address
            : notificationConfig.phone_number;

        if (!contactValue) return;

        try {
            setSendingVerification(channel);
            const response = await fetch("/api/notifications/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel, contact_value: contactValue }),
            });
            if (!response.ok) throw new Error("送信に失敗しました");

            if (channel === "email") toast.success("確認メールを送信しました 📩");
            else {
                toast.success("確認コードを送信しました 📱");
                setShowOtpInput(true);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "失敗しました");
        } finally {
            setSendingVerification(null);
        }
    };

    const verifyOtp = async () => {
        try {
            setVerifyingOtp(true);
            const response = await fetch("/api/notifications/verify/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: otpCode }),
            });
            if (!response.ok) throw new Error("認証に失敗しました");
            toast.success("認証されました ✅");
            updateNotification({ phone_verified: true });
            setShowOtpInput(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "失敗しました");
        } finally {
            setVerifyingOtp(false);
        }
    };

    const isDefaultEmail = notificationConfig.email_address === userEmail && userEmail !== "";
    const isEmailVerified = notificationConfig.email_verified || isDefaultEmail;
    const isPhoneVerified = notificationConfig.phone_verified;

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold">アカウント設定</h1>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="size-8 animate-spin text-primary/50" />
                </div>
            ) : (
                <div className="space-y-8">
                    {/* プロフィール */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <User className="size-5" />
                                プロフィール
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {user && (
                                <>
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <span className="text-sm text-muted-foreground">メールアドレス</span>
                                        <span className="font-medium">{user.email}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <span className="text-sm text-muted-foreground">ユーザーID</span>
                                        <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
                                    </div>
                                </>
                            )}
                            <div className="pt-2">
                                <Button variant="destructive" onClick={handleLogout} className="gap-2">
                                    <LogOut className="size-4" />
                                    ログアウト
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 通知設定 */}
                    <Card className="shadow-sm border-orange-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-500">
                                <BellRing className="size-5" />
                                通知設定
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-3">
                                <Label>通知対象の評価</Label>
                                <div className="flex gap-2">
                                    {[1, 2, 3].map(s => (
                                        <Button
                                            key={s}
                                            variant={notificationConfig.target_stars.includes(s) ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => toggleTargetStar(s)}
                                            className="rounded-full"
                                        >
                                            星{s}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-2"><Mail className="size-4" /> メール通知</div>
                                    <Switch checked={notificationConfig.email_enabled} onCheckedChange={handleEmailToggle} />
                                </div>
                                {notificationConfig.email_enabled && (
                                    <div className="pl-6 space-y-2">
                                        <div className="flex gap-2">
                                            <Input className="h-11" value={notificationConfig.email_address} onChange={e => handleEmailChange(e.target.value)} />
                                            {isEmailVerified && <CheckCircle2 className="size-5 text-green-500 mt-2" />}
                                        </div>
                                        {!isEmailVerified && (
                                            <Button size="sm" variant="outline" onClick={() => sendVerification("email")} disabled={!!sendingVerification}>
                                                確認メールを送信
                                            </Button>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-2"><Phone className="size-4" /> SMS通知</div>
                                    <Switch checked={notificationConfig.sms_enabled} onCheckedChange={handleSmsToggle} />
                                </div>
                                {notificationConfig.sms_enabled && (
                                    <div className="pl-6 space-y-2">
                                        <div className="flex gap-2">
                                            <Input className="h-11" value={notificationConfig.phone_number} onChange={e => updateNotification({ phone_number: e.target.value, phone_verified: false })} placeholder="+81..." />
                                            {isPhoneVerified && <CheckCircle2 className="size-5 text-green-500 mt-2" />}
                                        </div>
                                        {!isPhoneVerified && (
                                            <div className="space-y-2">
                                                <Button size="sm" variant="outline" onClick={() => sendVerification("sms")} disabled={!!sendingVerification}>
                                                    確認コードを送信
                                                </Button>
                                                {showOtpInput && (
                                                    <div className="flex gap-2 mt-2">
                                                        <Input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ""))} maxLength={6} className="max-w-[120px] h-11" />
                                                        <Button size="sm" onClick={verifyOtp} disabled={verifyingOtp}>認証</Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSave} disabled={saving}>
                                    {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                    設定を保存
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* プラン・利用状況 */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-600">
                                <ShieldCheck className="size-5" />
                                プラン・利用状況
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-4 bg-muted/30 rounded-lg">
                                <div className="text-sm font-medium mb-2">SMS送信数 (今月)</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-3xl font-bold">{smsUsage.sent}</span>
                                    <span className="text-muted-foreground mb-1">/ {smsUsage.limit} 通</span>
                                </div>
                                <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${Math.min((smsUsage.sent / smsUsage.limit) * 100, 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                    残りの送信可能数: {smsUsage.remaining}通
                                </div>
                                <div className="mt-4 pt-4 border-t space-y-4">
                                    <div
                                        onClick={() => window.location.href = '/settings/account/upgrade'}
                                        className="relative overflow-hidden p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg cursor-pointer hover:shadow-xl transition-all group"
                                    >
                                        <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full -mr-4 -mt-4 group-hover:scale-110 transition-transform"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2 text-xs font-bold bg-white/20 px-2 py-0.5 rounded w-fit mb-2 border border-white/30">
                                                <Sparkles className="w-3 h-3" /> HP制作会員様限定
                                            </div>
                                            <h4 className="font-black text-lg">特別グレードアッププラン</h4>
                                            <p className="text-[10px] text-blue-100 mt-1">維持管理費込の特別セット価格をご用意しました</p>
                                            <div className="mt-3 flex items-center text-xs font-bold gap-1 underline underline-offset-4">
                                                プランを確認する <ArrowRight className="w-3 s-3" />
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full text-gray-400 border-gray-100 hover:bg-gray-50 text-xs"
                                        onClick={() => window.location.href = '/plans'}
                                    >
                                        通常プランの一覧を見る
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
