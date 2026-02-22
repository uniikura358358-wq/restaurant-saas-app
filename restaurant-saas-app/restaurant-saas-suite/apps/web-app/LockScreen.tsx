"use client";

import { usePlanGuard } from "@/hooks/usePlanGuard";
import { Lock, CreditCard, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

export function LockScreen() {
    const { status } = usePlanGuard();
    const router = useRouter();

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <Card className="max-w-xl w-full bg-white border-none shadow-2xl rounded-[40px] overflow-hidden overflow-y-auto max-h-[95vh]">
                <div className="p-8 sm:p-12 text-center space-y-8">
                    <div className="relative inline-flex">
                        <div className="size-24 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
                            <Lock className="size-10 text-red-500" />
                        </div>
                        <div className="absolute -top-2 -right-2 bg-amber-400 p-2 rounded-full shadow-lg">
                            <AlertTriangle className="size-5 text-white" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                            管理画面へのアクセスが停止されています
                        </h2>
                        <p className="text-slate-500 font-bold leading-relaxed">
                            お支払いに失敗したため、ご利用を制限させていただいております。<br />
                            現在は、サービスを維持するためのお手続きのみ可能です。
                        </p>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 space-y-4 text-left border border-slate-100">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="size-1.5 rounded-full bg-red-400" /> 現在の状況
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                <span className="text-sm font-bold text-slate-600">管理画面へのログイン</span>
                                <span className="text-sm font-black text-red-500">遮断中</span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-200">
                                <span className="text-sm font-bold text-slate-600">AI・SNS連携機能</span>
                                <span className="text-sm font-black text-red-500">停止中</span>
                            </div>
                            <div className="flex items-center justify-between py-2">
                                <span className="text-sm font-bold text-slate-600">公式ホームページ公開</span>
                                <span className="text-sm font-black text-amber-500">まもなく停止 (要お手続き)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-16 rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 w-full group"
                            onClick={() => router.push("/plans")}
                        >
                            <CreditCard className="size-6 mr-3" />
                            お支払い情報を更新して再開する
                            <ArrowRight className="size-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <p className="text-xs text-slate-400 font-bold">
                            お支払いの確認ができ次第、すべての制限は即座に解除されます。
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={() => window.location.href = "mailto:support@example.com"}
                            className="text-sm font-bold text-indigo-500 hover:underline"
                        >
                            お困りの方はサポートまでお問い合わせください
                        </button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
