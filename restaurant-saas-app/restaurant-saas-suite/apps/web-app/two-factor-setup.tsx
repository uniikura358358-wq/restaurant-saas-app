"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Smartphone,
    Mail,
    ShieldCheck,
    ArrowRight,
    Loader2,
    CheckCircle2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface TwoFactorSetupProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onComplete?: () => void;
    email?: string | null;
}

export function TwoFactorSetup({ open, onOpenChange, onComplete, email }: TwoFactorSetupProps) {
    const [step, setStep] = useState<"select" | "totp" | "email" | "complete">("select");
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState("");

    // Mock data for TOTP
    const mockSecret = "MOGMOGRESTAURANTSAAS";
    const otpAuthUrl = `otpauth://totp/MogMog:${email || "user"}?secret=${mockSecret}&issuer=MogMog`;

    const handleNextStep = (next: "totp" | "email") => {
        setStep(next);
    };

    const verifyCode = async () => {
        setLoading(true);
        // シミュレーション
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (code === "123456" || step === "email") {
            setStep("complete");
            onComplete?.();
            toast.success("2段階認証が有効になりました");
        } else {
            toast.error("認証コードが正しくありません");
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) setStep("select");
            onOpenChange(val);
        }}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl p-8 border-none shadow-2xl">
                <DialogHeader className="space-y-4">
                    <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                        <ShieldCheck className="size-6 text-primary" />
                        2段階認証のセットアップ
                    </DialogTitle>
                    <DialogDescription className="text-sm font-medium leading-relaxed">
                        {step === "select" && "アカウントの保護に使用する方法を選択してください。"}
                        {step === "totp" && "Google Authenticator 等の認証アプリでQRコードを読み取ってください。"}
                        {step === "email" && "登録済みのメールアドレスに送信されたコードを入力してください。"}
                        {step === "complete" && "セットアップがすべて完了しました。"}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 min-h-[200px] flex flex-col items-center justify-center">
                    {step === "select" && (
                        <div className="w-full space-y-3">
                            <button
                                onClick={() => handleNextStep("totp")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-primary/10 bg-primary/5 hover:border-primary/30 transition-all text-left group"
                            >
                                <div className="p-3 bg-primary rounded-xl text-white group-hover:scale-110 transition-transform">
                                    <Smartphone className="size-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-foreground">認証アプリ (推奨)</p>
                                    <p className="text-[10px] text-muted-foreground">Google/Microsoft Authenticator等</p>
                                </div>
                                <ArrowRight className="size-4 text-muted-foreground" />
                            </button>

                            <button
                                onClick={() => handleNextStep("email")}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border bg-muted/50 hover:border-primary/30 transition-all text-left group"
                            >
                                <div className="p-3 bg-muted-foreground/30 rounded-xl text-foreground group-hover:scale-110 transition-transform">
                                    <Mail className="size-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-foreground">メールアドレス</p>
                                    <p className="text-[10px] text-muted-foreground">登録済みのアドレスにコードを送信</p>
                                </div>
                                <ArrowRight className="size-4 text-muted-foreground" />
                            </button>
                        </div>
                    )}

                    {step === "totp" && (
                        <div className="flex flex-col items-center space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 bg-white rounded-3xl border shadow-sm">
                                <QRCodeSVG value={otpAuthUrl} size={180} />
                            </div>
                            <div className="w-full space-y-2">
                                <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">認証コードを入力 (6桁)</Label>
                                <Input
                                    placeholder="000000"
                                    className="h-14 rounded-2xl text-center text-2xl font-black tracking-[0.5em] border-gray-100 bg-gray-50"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {step === "email" && (
                        <div className="flex flex-col items-center space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 bg-primary/10 rounded-full">
                                <Mail className="size-12 text-primary" />
                            </div>
                            <div className="w-full space-y-2">
                                <p className="text-[11px] text-center text-muted-foreground font-medium px-4">
                                    <span className="font-bold text-foreground">{email}</span> 宛に確認コードを送信しました。
                                </p>
                                <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1 mt-4 block">認証コード</Label>
                                <Input
                                    placeholder="000000"
                                    className="h-14 rounded-2xl text-center text-2xl font-black tracking-[0.5em] border-gray-100 bg-gray-50"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {step === "complete" && (
                        <div className="flex flex-col items-center justify-center space-y-4 animate-in zoom-in duration-500">
                            <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="size-10 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-black text-foreground">設定完了！</h3>
                            <p className="text-sm text-center text-muted-foreground font-medium max-w-[280px]">
                                次回のログインから2段階認証が適用されます。セキュリティが強化されました。
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {step === "select" ? (
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold">キャンセル</Button>
                    ) : step === "complete" ? (
                        <Button onClick={() => onOpenChange(false)} className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold text-white">閉じる</Button>
                    ) : (
                        <div className="flex w-full gap-3">
                            <Button variant="ghost" onClick={() => setStep("select")} className="rounded-xl font-bold">戻る</Button>
                            <Button
                                onClick={verifyCode}
                                disabled={code.length < 6 || loading}
                                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-200"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                確認する
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
