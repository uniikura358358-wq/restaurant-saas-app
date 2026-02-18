'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Store, CreditCard, Mail, Search, Globe } from 'lucide-react';

export default function CommercialTransactionsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Store className="w-6 h-6 text-green-600" />
                        <h1 className="text-xl font-black text-gray-900">特定商取引法に基づく表記</h1>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="font-bold">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 戻る
                    </Button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
                    <section className="space-y-0 text-gray-700">
                        <table className="w-full border-collapse">
                            <tbody>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left w-1/3 font-black text-gray-900 bg-gray-50/50 rounded-tl-2xl flex items-center gap-2">
                                        <Store className="w-4 h-4" />
                                        販売事業者
                                    </th>
                                    <td className="py-6 px-4">[運営者名/会社名]</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        <Search className="w-4 h-4" />
                                        代表者
                                    </th>
                                    <td className="py-6 px-4">[代表者名]</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        商品代金以外に必要な料金
                                    </th>
                                    <td className="py-6 px-4">
                                        <h4 className="font-bold text-gray-800 mb-1">商品代金以外に必要な料金</h4>
                                        <p className="text-sm">
                                            銀行振込手数料（振込時），インターネット接続料金その他の電気通信回線の通信に関する費用（ユーザー負担）。<br />
                                            <span className="text-orange-600 font-bold">【WEB会員特典ドメイン特約】</span><br />
                                            ドメイン初回取得価格が4,000円（税込）を超える場合，取得手数料10,000円（税込）および4,000円超過分の差額実費を別途申し受けます。また，2年目以降の更新費用は実費負担として別途徴収いたします（本条項に同意したものとみなします）。※.inc等の極めて高額なドメインは別途見積もり。
                                        </p>
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        <Globe className="w-4 h-4" />
                                        所在地
                                    </th>
                                    <td className="py-6 px-4">[住所（例：東京都〇〇区...）]</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        お問い合わせ先
                                    </th>
                                    <td className="py-6 px-4">
                                        [メールアドレス]<br />
                                        <span className="text-sm text-gray-500">※電話番号については，お問い合わせいただいた際に遅滞なく開示いたします。</span>
                                    </td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        販売価格
                                    </th>
                                    <td className="py-6 px-4">利用プランごとに表示（表示価格は消費税を含みます）</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        支払い時期
                                    </th>
                                    <td className="py-6 px-4">クレジットカード決済：購入完了時に決済されます。</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        支払い方法
                                    </th>
                                    <td className="py-6 px-4">クレジットカード決済（Stripe）</td>
                                </tr>
                                <tr className="border-b border-gray-100">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 flex items-center gap-2">
                                        商品の引渡時期
                                    </th>
                                    <td className="py-6 px-4">決済完了後，即時に利用可能となります（HP制作プランの場合は別途制作期間を要します）。</td>
                                </tr>
                                <tr className="">
                                    <th className="py-6 px-4 text-left font-black text-gray-900 bg-gray-50/50 rounded-bl-2xl flex items-center gap-2">
                                        返品・キャンセル
                                    </th>
                                    <td className="py-6 px-4">
                                        サービスの性質上，決済完了後の返品・返金には応じられません。<br />
                                        契約の解約は管理画面からいつでも可能です。解約後も利用期間終了まではサービスをご利用いただけます。
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>
                </div>
            </main>
        </div>
    );
}
