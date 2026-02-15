'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { STRIPE_PLANS } from '@/lib/stripe/config';
import { toast } from 'sonner';
import { Check, Loader2, ArrowRight, Star, ShieldCheck, Zap, Globe, LayoutTemplate, Sparkles, MessageSquare, Bot, Instagram, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomerSupportChat } from '@/components/CustomerSupportChat';

export default function PlansPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
            <PlansContent />
            <CustomerSupportChat />
        </Suspense>
    );
}

function PlansContent() {
    const router = useRouter();
    const { user, loading } = useAuth();
    // Default to 'month' as requested
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    // Handle Cancel State
    useEffect(() => {
        if (searchParams.get('canceled')) {
            toast.info('いつでもお待ちしております', {
                description: '決済はキャンセルされました。料金は発生していません。',
                duration: 5000,
            });
        }
    }, [searchParams]);

    const handleCheckout = async (priceId: string, planName: string) => {
        if (!user) {
            toast.error('ログインが必要です');
            router.push('/login?redirect=/plans');
            return;
        }

        setProcessingId(priceId);
        toast.info('Stripe 決済ページへ安全に遷移します...');

        try {
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    userId: user.uid,
                    planName,
                    billingCycle
                }),
            });

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('決済URLの取得に失敗しました');
            }
        } catch (error) {
            console.error(error);
            toast.error('決済への遷移に失敗しました');
            setProcessingId(null);
        }
    };

    // Comparison Total (Light + Std + POP) vs Premium
    const singlesBundlePrice =
        (billingCycle === 'year' ? 25800 : 2480 * 12) +
        (billingCycle === 'year' ? 83300 : 7980 * 12) +
        (billingCycle === 'year' ? 25800 : 2480 * 12);

    const premiumPrice = billingCycle === 'year' ? STRIPE_PLANS.BUSINESS_PREMIUM.yearly.price : STRIPE_PLANS.BUSINESS_PREMIUM.price * 12;
    const premiumSavings = singlesBundlePrice - premiumPrice;

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
                        MogMog Plans
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-2 border-blue-500 text-blue-600 hover:bg-blue-600 hover:text-white font-bold rounded-full px-4 shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all duration-300 animate-pulse hover:animate-none flex items-center gap-1.5 h-10"
                            onClick={() => document.getElementById('hp-creation')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            <Sparkles className="w-4 h-4 text-orange-400" />
                            WEBページ作成代行プランもあります!!
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-gray-900"
                            onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            よくあるご質問
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
                            ダッシュボードへ戻る
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
                        24時間365日、AIがあなたの店の<br />
                        <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">「最強の営業マン」</span>に。
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                        集客の苦労を自動的な成長へ。リスクは一切ありません。<br />
                        <span className="font-bold text-gray-900">初期費用0円・契約の縛りなし。</span>今日から、最新のAIをあなたの仲間に。
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex items-center justify-center gap-4 bg-white inline-flex rounded-full p-1 border shadow-sm relative">
                        {/* Highlight Effect for Yearly if Monthly is selected */}
                        {billingCycle === 'month' && (
                            <span className="absolute -right-2 -top-2 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                            </span>
                        )}

                        <button
                            onClick={() => setBillingCycle('month')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${billingCycle === 'month'
                                ? 'bg-gray-900 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            月払い
                        </button>
                        <button
                            onClick={() => setBillingCycle('year')}
                            className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === 'year'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'text-orange-600 hover:text-orange-700 bg-orange-50 border border-orange-200 shadow-[0_0_15px_rgba(251,146,60,0.3)] animate-pulse'
                                }`}
                        >
                            年払い
                            <span className={`text-xs px-2 py-0.5 rounded-full ${billingCycle === 'year' ? 'bg-white/20' : 'bg-orange-200 text-orange-800'}`}>
                                最大17%お得
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans Grid - 3 Columns for Light, Standard, Premium */}
                <div className="grid md:grid-cols-3 gap-12 items-stretch px-6 py-12 max-w-6xl mx-auto">
                    {/* Light Plan */}
                    <div className="flex flex-col h-full group">
                        <div className="bg-white rounded-[24px] shadow-sm border-2 border-blue-500 relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                            {billingCycle === 'year' && (
                                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg z-20 shadow-sm">
                                    🥈 13% OFF
                                </div>
                            )}
                            <div className="p-8 pb-10 flex flex-col h-full">
                                <div className="h-[90px] mb-6">
                                    <h3 className="text-2xl font-bold text-gray-900">Light Plan</h3>
                                    <p className="text-xs text-blue-600 font-bold leading-relaxed mt-1">
                                        Googleマップ対策で新規客を獲得。<br />
                                        まずはここから、お店の認知度アップ。
                                    </p>
                                </div>

                                <div className="mb-8 min-h-[65px]">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-gray-900">
                                            ¥{billingCycle === 'year' ? '25,800' : '2,480'}
                                        </span>
                                        <span className="text-gray-500 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                    </div>
                                    {billingCycle === 'year' && (
                                        <p className="text-[11px] text-red-500 font-extrabold mt-1">
                                            年払いで ¥{(2480 * 12 - 25800).toLocaleString()} お得
                                        </p>
                                    )}
                                </div>

                                <div className="flex-grow">
                                    <ul className="space-y-4 text-sm text-gray-600 mb-8">
                                        <li className="flex gap-3 text-gray-900 font-bold items-center">
                                            <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                            Google口コミ一元管理
                                        </li>
                                        <li className="flex gap-3 items-center">
                                            <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                            AI自動返信 / 半自動返信
                                        </li>
                                        <li className="flex gap-3 items-center">
                                            <ShieldCheck className="w-5 h-5 text-red-500 flex-shrink-0" />
                                            <span className="font-bold text-red-600">低評価緊急通知機能</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="mt-auto pt-6 space-y-4">
                                    <Button
                                        variant="outline"
                                        className="w-full border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white font-bold h-12 rounded-xl transition-all"
                                        onClick={() => handleCheckout(
                                            billingCycle === 'year' ? STRIPE_PLANS.LIGHT.yearly.id : STRIPE_PLANS.LIGHT.id,
                                            'Light Plan'
                                        )}
                                        disabled={!!processingId}
                                    >
                                        選択する
                                    </Button>
                                    <p className="text-[10px] text-gray-400 text-center font-medium">
                                        🔒 解約自由・違約金なし<br />
                                        安心してスタートできます。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Standard Plan (Main Focus) */}
                    <div className="flex flex-col h-full transform scale-105 z-10">
                        <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(249,115,22,0.2)] border-[3px] border-orange-500 relative flex flex-col h-full overflow-hidden transition-all duration-300">
                            {/* Header Label (In-flow to prevent border overlap) */}
                            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-center text-[11px] font-black py-1.5 uppercase tracking-tighter shadow-sm">
                                🏆 最も選ばれています
                            </div>

                            {billingCycle === 'year' && (
                                <div className="absolute top-7 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-black px-3 py-1 rounded-bl-lg shadow-sm z-20">
                                    🥇 17% OFF
                                </div>
                            )}

                            <div className="p-8 pb-10 flex flex-col h-full mt-2">
                                <div className="h-[90px] mb-6">
                                    <h3 className="text-2xl font-black text-orange-900">Standard Plan</h3>
                                    <p className="text-xs text-orange-600 font-bold leading-relaxed mt-1">
                                        新規・リピーターを確実にキャッチ！<br />
                                        インスタ連携で「お店のファン」を倍増。
                                    </p>
                                </div>

                                <div className="mb-8 min-h-[65px]">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black tracking-tighter text-orange-600">
                                            ¥{billingCycle === 'year' ? '97,600' : '9,800'}
                                        </span>
                                        <span className="text-gray-500 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                    </div>
                                    {billingCycle === 'year' && (
                                        <p className="text-[11px] text-red-600 font-black mt-1">
                                            <Zap className="w-3 h-3 inline mr-1" />年払いで ¥{(9800 * 12 - 97600).toLocaleString()} お得
                                        </p>
                                    )}
                                </div>

                                <div className="flex-grow space-y-5">
                                    <ul className="space-y-4 text-sm text-gray-700 mb-8">
                                        <li className="flex gap-3 font-bold items-center bg-orange-50/70 p-2.5 rounded-xl border border-orange-100/50">
                                            <Star className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                            Light Planの全機能
                                        </li>
                                        <li className="flex gap-3 font-bold text-gray-800 items-start">
                                            <Sparkles className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                プロ級の構図！簡単ガイド付カメラ
                                                <span className="block text-[10px] text-gray-400 font-normal mt-0.5">スマホで撮るだけで最高の仕上がり</span>
                                            </div>
                                        </li>
                                        <li className="flex gap-3 font-bold text-gray-800 items-start">
                                            <Check className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                インスタ半自動投稿
                                                <span className="text-[9px] font-bold text-white bg-red-500 px-1.5 py-0 rounded-full ml-1 shadow-sm inline-block">
                                                    爆速集客
                                                </span>
                                            </div>
                                        </li>
                                        <li className="flex gap-3 bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200 items-center transform hover:scale-[1.02] transition-transform">
                                            <Instagram className="w-5 h-5 flex-shrink-0" />
                                            <span className="text-[11px] font-black tracking-tight italic">インスタ専用カメラガイド(正方形対応) 搭載 !!</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="mt-auto pt-6 space-y-4">
                                    <Button
                                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg font-black h-14 rounded-2xl text-xl"
                                        onClick={() => handleCheckout(
                                            billingCycle === 'year' ? STRIPE_PLANS.BUSINESS.yearly.id : STRIPE_PLANS.BUSINESS.id,
                                            'Standard Plan'
                                        )}
                                        disabled={!!processingId}
                                    >
                                        {processingId ? <Loader2 className="animate-spin w-5 h-5" /> : '今すぐ無料で始める'}
                                    </Button>
                                    <p className="text-[10px] text-gray-400 text-center font-bold">
                                        👑 92%の店舗様がこちらを選んでいます
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Premium Plan */}
                    <div className="flex flex-col h-full group">
                        <div className="bg-white rounded-[24px] shadow-sm border-2 border-indigo-600 relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(79,70,229,0.2)] hover:-translate-y-1">
                            {/* Header Label (In-flow) */}
                            <div className="bg-indigo-900 text-white text-center text-[11px] font-bold py-1.5 tracking-widest shadow-sm">
                                💎 完全おまかせ / VIP
                            </div>

                            {billingCycle === 'year' && (
                                <div className="absolute top-7 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg shadow-sm border border-yellow-200 z-20">
                                    🥇 17% OFF
                                </div>
                            )}

                            <div className="p-8 pb-10 flex flex-col h-full mt-2">
                                <div className="h-[90px] mb-6">
                                    <h3 className="text-2xl font-bold text-indigo-900">Premium Plan</h3>
                                    <p className="text-xs text-indigo-600 font-bold leading-relaxed mt-1">
                                        AIによる究極の店舗経営を。<br />
                                        分析・作成・サポートのすべてがここに.
                                    </p>
                                </div>

                                <div className="mb-8 min-h-[65px]">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-indigo-900">
                                            ¥{billingCycle === 'year' ? '127,400' : '12,800'}
                                        </span>
                                        <span className="text-indigo-600 font-bold text-sm">/{billingCycle === 'year' ? '年' : '月'}</span>
                                    </div>
                                    {billingCycle === 'year' && (
                                        <div className="mt-1 space-y-1">
                                            <p className="text-[11px] text-red-600 font-extrabold flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> 年払いで ¥{(12800 * 12 - 127400).toLocaleString()} お得
                                            </p>
                                            {premiumSavings > 0 && (
                                                <p className="text-[9px] text-indigo-500 font-bold bg-indigo-50/50 inline-block px-2 py-0.5 rounded border border-indigo-100/50">
                                                    単品合計より 年{premiumSavings.toLocaleString()}円 お得！
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex-grow space-y-5">
                                    <ul className="space-y-4 text-sm text-gray-700 mb-8">
                                        <li className="flex gap-3 text-indigo-900 font-bold items-center bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100/50">
                                            <Star className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                                            Standard Planの全機能
                                        </li>
                                        <li className="flex gap-3 font-bold items-center">
                                            <div className="bg-indigo-100 p-1 rounded-full">
                                                <Check className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            POP/メニューAI自動作成
                                        </li>
                                        <li className="flex gap-3 font-bold items-center">
                                            <div className="bg-indigo-100 p-1 rounded-full">
                                                <Check className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            顧客分析AI
                                        </li>
                                        <li className="flex gap-3 font-bold items-center">
                                            <div className="bg-indigo-100 p-1 rounded-full">
                                                <Check className="w-4 h-4 text-indigo-600" />
                                            </div>
                                            優先サポート
                                        </li>
                                    </ul>
                                </div>

                                <div className="mt-auto pt-6 space-y-4">
                                    <Button
                                        className="w-full bg-indigo-900 hover:bg-indigo-950 text-white shadow-lg transition-all border border-indigo-700 font-bold h-12 rounded-xl"
                                        onClick={() => handleCheckout(
                                            billingCycle === 'year' ? STRIPE_PLANS.BUSINESS_PREMIUM.yearly.id : STRIPE_PLANS.BUSINESS_PREMIUM.id,
                                            'Premium Plan'
                                        )}
                                        disabled={!!processingId}
                                    >
                                        プレミアムで始める
                                    </Button>
                                    <p className="text-[10px] text-gray-400 text-center font-medium">
                                        🔒 専属担当のような安心感<br />
                                        売上最大化のパートナーとして。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* HP Creation Service Section */}
                <div id="hp-creation" className="mt-16 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-lg p-8 md:p-12 text-gray-800 relative overflow-hidden scroll-mt-24">
                    <div className="absolute top-0 right-0 p-32 bg-white opacity-40 rounded-full transform translate-x-12 -translate-y-12"></div>
                    <div className="relative z-10 flex flex-col gap-10">
                        {/* Header Part - Centered */}
                        <div className="w-full flex flex-col items-center text-center gap-6 relative">
                            <div className="max-w-3xl mx-auto">
                                <div className="flex items-center justify-center gap-3 mb-6">
                                    <Globe className="w-7 h-7 text-blue-600" />
                                    <span className="font-bold text-blue-600 tracking-wider text-xl">WEBページ作成代行プラン</span>
                                    <Badge className="bg-red-500 text-white text-sm font-bold px-3 py-1 animate-pulse shadow-md shadow-red-200 border-0">
                                        業界最安級！！
                                    </Badge>
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight">
                                        お店の顔となる、洗練されたwebサイトを今すぐ。
                                    </h2>
                                    <p className="text-base md:text-lg text-gray-500 font-medium leading-relaxed">
                                        認知度アップに欠かせない公式サイトを、<br className="md:hidden" />スピーディーかつリーズナブルに。
                                    </p>
                                    <p className="text-base md:text-lg text-gray-600 font-medium">
                                        必要な情報を1ページに凝縮。さらに、<span className="text-blue-600 font-bold">Google口コミの自動返信機能</span>を標準搭載した最強の集客ツールです。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content Part (Two Cards Side-by-Side) */}
                        {/* Centered Card Grid */}
                        <div className="grid md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto w-full">
                            {/* Card 1: Standard */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-white p-8 rounded-2xl border-2 border-blue-500 shadow-lg flex flex-col justify-between h-full hover:shadow-xl transition-shadow">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex justify-between items-start gap-4 mb-2">
                                                    <h3 className="text-xl font-bold text-gray-900 border-b-2 border-blue-100 pb-1 whitespace-nowrap">WEBページ作成代行プラン</h3>
                                                    <Badge className="bg-red-500 text-white text-[12px] font-bold px-3 py-1 flex-shrink-0 animate-pulse shadow-sm shadow-red-100 border-0 whitespace-nowrap">
                                                        最短7日間以内で納品可能！！
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-400 mt-2 font-medium">基本の管理・保守。ご自身で手軽に更新したい店舗様へ。</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-center">
                                            <div>
                                                <div className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest">制作初期費用 (初回のみ作成料)</div>
                                                <div className="text-4xl font-bold text-gray-900">¥39,800</div>
                                            </div>
                                            <div className="w-full h-px bg-gray-100"></div>
                                            <div>
                                                <div className="text-xs text-blue-500 font-bold mb-1 uppercase tracking-widest">維持管理費 (スタンダード)</div>
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <span className="text-4xl font-bold text-gray-900">¥2,980</span>
                                                    <span className="text-gray-500 text-sm">/月</span>
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-1 flex items-center justify-center gap-1">
                                                    ※月30回程度のAI利用枠込み
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-blue-50/50 p-2 rounded-xl">
                                                <Star className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                                <span className="text-blue-700">Google口コミ自動返信機能 搭載！！</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-blue-50/50 p-2 rounded-xl">
                                                <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                <span>スマホひとつでメニューの画像更新可能 !!</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-blue-100/50 p-2 rounded-xl border border-blue-200 shadow-sm">
                                                <Instagram className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                                <span className="text-blue-800">インスタ専用カメラガイド(正方形対応) !!</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-md"
                                        onClick={() => window.open('/ginza-ramen', '_blank')}
                                    >
                                        WEBページ見本サイトを見る
                                    </Button>
                                </div>
                            </div>

                            {/* Card 2: Daily Menu */}
                            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl border-2 border-indigo-200 shadow-xl flex flex-col justify-between h-full hover:border-indigo-400 transition-colors">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xl mb-1">
                                                <Sparkles className="w-6 h-6" />
                                                日替わり特化プラン
                                            </div>
                                            <p className="text-sm text-gray-500 italic">毎日更新したい、こだわりの店舗様へ。</p>
                                        </div>
                                        <Badge className="bg-indigo-600 text-white border-0 shadow-sm">おすすめ！</Badge>
                                    </div>

                                    <p className="text-gray-600 text-sm leading-relaxed border-l-4 border-indigo-100 pl-4">
                                        頻繁に画像を差し替えたいお客様向けに、更新枠を大幅拡充。
                                        **月50〜60回程度** の高頻度更新が可能です。
                                    </p>

                                    <div className="space-y-4 text-center py-4 border-y border-indigo-50">
                                        <div>
                                            <div className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-widest">制作初期費用 (初回のみ作成料)</div>
                                            <div className="text-4xl font-bold text-gray-900">¥39,800</div>
                                        </div>
                                        <div className="w-full h-px bg-gray-100"></div>
                                        <div>
                                            <div className="text-xs text-indigo-400 font-bold mb-1 uppercase tracking-widest">維持管理費 (特別プラン)</div>
                                            <div className="flex items-baseline justify-center gap-2">
                                                <span className="text-4xl font-black text-indigo-900">¥3,980</span>
                                                <span className="text-gray-500 font-bold">/月</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-indigo-50/50 p-2 rounded-lg">
                                            <Star className="w-4 h-4 text-orange-500" /> <span className="text-indigo-700">Google口コミ自動返信機能 搭載！！</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-indigo-50/50 p-2 rounded-lg">
                                            <Check className="w-4 h-4 text-indigo-500" /> スマホで日替りメニューを簡単更新！！
                                        </div>
                                        <div className="flex items-center gap-3 text-sm font-bold text-gray-700 bg-indigo-50/50 p-2 rounded-lg">
                                            <Check className="w-4 h-4 text-indigo-500" /> AIが文章を磨き上げ集客力UP！！
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-4 border-t border-indigo-50">
                                    <span className="block text-center text-lg font-bold text-indigo-600 animate-pulse">
                                        ✨ 毎日が「お店の旬」になります！！
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* AI Chatbot Highlight (Moved below cards) */}
                        <div className="hidden lg:flex flex-col items-center gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-white shadow-[0_10px_40px_rgb(0,0,0,0.06)] transform hover:-translate-y-1 transition-all duration-300 max-w-sm mx-auto">
                            <div className="relative">
                                <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
                                    <MessageSquare className="w-8 h-8 text-white" fill="white" />
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="text-[14px] font-black text-gray-900 tracking-tight">AIチャットカスタマー</span>
                                </div>
                                <p className="text-sm text-gray-600 font-bold leading-relaxed whitespace-pre-line">
                                    ご相談や詳しいご質問は<br />
                                    右側の青いチャットカスタマーが<br />
                                    受付けております。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div id="faq" className="mt-20 max-w-4xl mx-auto scroll-mt-20">
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
                        よくあるご質問
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. 契約期間の縛りはありますか？</h3>
                            <p className="text-gray-600">
                                いいえ、ございません。全てのプランで解約違約金などの発生はなく、いつでも解約が可能です。
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. 支払い方法は何がありますか？</h3>
                            <p className="text-gray-600">
                                クレジットカード（Visa, Mastercard, Amex, JCBなど）および、銀行振込（バーチャル口座への送金）に対応しています。法人・個人のお客様問わずご利用いただけます。
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. プランの変更は可能ですか？</h3>
                            <p className="text-gray-600">
                                はい、ダッシュボードからいつでもプランのアップグレード・ダウングレードが可能です。
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. HP制作の納期はどれくらいですか？</h3>
                            <p className="text-gray-600">
                                素材をいただいてから、通常1〜2週間程度で納品可能です。お急ぎの場合はご相談ください。
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. 導入後のサポート体制は？</h3>
                            <p className="text-gray-600">
                                はい、操作方法で迷った際は、管理画面内のチャットやメールでいつでもご相談いただけます。Premiumプランなら優先サポートもございます。
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. 申し込み後すぐに使えますか？</h3>
                            <p className="text-gray-600">
                                はい、クレジットカード決済完了後、わずか数分ですべての機能をご利用いただけます。HP制作代行のみ、1〜2週間のお時間をいただいております。
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. ホームページの修正は自分でできますか？</h3>
                            <p className="text-gray-600">
                                はい、もちろんです！専用の管理画面からスマホで写真を撮ってそのまま差し替えるだけで、即時にページが更新されます。**ご自身で更新される場合は追加費用もかからず、24時間365日いつでも無料**ですので、最もお得でスピーディーです。
                                <span className="block mt-2 text-sm leading-relaxed text-gray-500">
                                    ※AIアシスト機能には月間利用目安（20〜30回程度）がありますが、足りなくなった場合も **1,000円の追加枠（25〜30回程度の更新目安）** で継続可能です。追加分は当月内でリセットされ、翌月への繰り越しはできません。<br />
                                    ※弊社へ作業を代行依頼される場合は、別途 月額10,000円（納期1〜2週間）を頂戴しております。
                                </span>
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border shadow-sm">
                            <h3 className="font-bold text-lg mb-2 text-gray-900">Q. パソコンを持っていませんが、スマホだけで使えますか？</h3>
                            <p className="text-gray-600">
                                はい、全ての機能がスマートフォンに対応しています。日々の口コミ返信やメニュー更新など、スマホ一台で完結します。
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
