'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ShieldAlert, Scale, ScrollText } from 'lucide-react';

export default function TermsOfServicePage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ScrollText className="w-6 h-6 text-orange-500" />
                        <h1 className="text-xl font-black text-gray-900">利用規約</h1>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="font-bold">
                        <ChevronLeft className="w-4 h-4 mr-1" /> 戻る
                    </Button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm mb-8 text-right">最終更新日：2026年2月18日</p>

                    <section className="space-y-8 text-gray-700 leading-relaxed">
                        <p>
                            この利用規約（以下，「本規約」といいます。）は，[運営者名/会社名]（以下，「当方」といいます。）が提供するサービス「MogMog」（以下，「本サービス」といいます。）の利用条件を定めるものです。登録ユーザーの皆様（以下，「ユーザー」といいます。）には，本規約に従って本サービスをご利用いただきます。
                        </p>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <Scale className="w-5 h-5 text-orange-500" />
                                第1条（適用）
                            </h2>
                            <p>
                                本規約は，ユーザーと当方との間の本サービスの利用に関わる一切の関係に適用されるものとします。当方は本サービスに関し，本規約のほか，各種の規定（以下，「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず，本規約の一部を構成するものとします。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <ShieldAlert className="w-5 h-5 text-red-500" />
                                第2条（AI生成物に関する免責事項・重要）
                            </h2>
                            <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl space-y-4">
                                <p className="font-bold text-red-700">本サービスは人工知能（AI）を利用してコンテンツを生成しますが，以下の事項を承諾の上で利用するものとします。</p>
                                <ul className="list-disc list-inside space-y-2 text-sm text-red-800">
                                    <li>AIが生成する回答案，投稿案，画像等の内容の正確性，妥当性，適法性について，当方は一切の保証を行いません。</li>
                                    <li>ユーザーは，AIが生成した内容を自らの責任で確認・修正した上で利用するものとし，公開されたコンテンツに起因する第三者との紛争や損害について，当方は一切の責任を負いません。</li>
                                    <li>AIの性質上，事実と異なる情報（ハルシネーション）が含まれる可能性があることを理解し，特に店舗情報やサービス内容に関する公開前には厳重な確認を行うものとします。</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第3条（利用登録）</h2>
                            <p>
                                本サービスにおいては，登録希望者が本規約に同意の上，当方の定める方法によって利用登録を申請し，当方がこれを承認することによって，利用登録が完了するものとします。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第4条（利用料金および支払方法）</h2>
                            <p>
                                ユーザーは，本サービスの有料部分の対価として，当方が別途定め，本ウェブサイトに表示する利用料金を，当方が指定する方法により支払うものとします。
                            </p>
                            <div className="mt-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                                <p className="font-bold mb-2 underline decoration-orange-200">【料金期間の定義】</p>
                                <p>本サービスにおける「1ヶ月間」または「1年間」とは，利用登録日または更新日から翌月または翌年の同日の前日まで（翌月に同日がない場合は翌月末日まで）を指すものとします。</p>
                            </div>
                            <p className="mt-4 text-xs text-gray-500">
                                ※決済プラットフォームとしてStripeを使用しており，支払条件はStripeの規定に準じます。利用期間途中の解約における返金は行わないものとします。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第5条（プランの変更・アップグレード・ダウングレード）</h2>
                            <div className="space-y-4">
                                <p>ユーザーは，当方所定の方法により利用プランの変更を申し込むことができます。</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 border border-blue-100 bg-blue-50/30 rounded-2xl">
                                        <p className="font-bold text-blue-700 mb-2">● アップグレード</p>
                                        <p className="text-sm">上位プランへの変更は即時適用されます。当該月（または年）の残期間に応じた差額精算（日割り計算等）が発生し，即時に決済されるものとします。</p>
                                    </div>
                                    <div className="p-4 border border-gray-200 bg-gray-50/50 rounded-2xl">
                                        <p className="font-bold text-gray-600 mb-2">● ダウングレード</p>
                                        <p className="text-sm">下位プランへの変更は予約として受け付けられます。実際の切り替えは「現行プランの利用期間終了後」となります。期間途中の差額返金は行いません。</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第6条（外部プラットフォーム連携）</h2>
                            <p>
                                本サービスが提供するGoogle公式APIやInstagram公式API等との連携機能において，外部プラットフォーム側の仕様変更，不具合，またはユーザーのアカウント停止等により本サービスの一部または全部が利用不能となった場合，当方はこれによって生じた損害について一切責任を負いません。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第7条（情報の権利帰属および二次利用）</h2>
                            <div className="space-y-4">
                                <p>1. 本サービスを通じて蓄積された店舗データ，売上データ，およびAIによる解析結果（以下「蓄積データ」といいます）に関する統計的な権利は当方に帰属するものとします。</p>
                                <p>2. 当方は，蓄積データを個人が特定できない統計情報に加工した上で，当方の多角的なビジネス展開（市場分析，新規機能開発，コンサルティング業務等）のために無償且つ永続的に利用できるものとします。</p>
                                <p>3. ユーザーは，当方が登録メールアドレス宛に，本サービス以外の当方が運営する他事業に関する案内を送信することに予め同意するものとします。</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第8条（禁止事項）</h2>
                            <p>ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 ml-4 text-sm">
                                <li>法令または公序良俗に違反する行為</li>
                                <li>犯罪行為に関連する行為</li>
                                <li>当方のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
                                <li>当方のサービスの運営を妨害するおそれのある行為</li>
                                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                                <li>他のユーザーに成りすます行為</li>
                                <li>その他，当方が不適切と判断する行為</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第9条（反社会的勢力の排除）</h2>
                            <div className="space-y-4 text-sm leading-relaxed">
                                <p>1. ユーザーは，当方に対し，自己が現在，暴力団，暴力団員，暴力団準構成員，暴力団関係企業，総会屋，社会運動標ぼうゴロ，特殊知能暴力集団等，その他これらに準ずる者（以下「反社会的勢力」といいます）に該当しないこと，および将来にわたっても該当しないことを表明し，保証するものとします。</p>
                                <p>2. 当方は，ユーザーが反社会的勢力に該当すると判断した場合，何らの催告を要せず，直ちに本契約を解除し，本サービスの提供を停止できるものとします。この場合，当方は，解除によりユーザーに生じた損害について一切の責任を負わないものとします。</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第10条（WEB制作・管理に関する特約）</h2>
                            <div className="space-y-4">
                                <p>WEB制作・管理が含まれるプラン（以下「WEB会員」といいます）において，以下の事項が適用されます。</p>
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl space-y-4">
                                    <div>
                                        <p className="font-bold text-orange-800 mb-2 underline decoration-orange-200">1. 権利の帰属と制作実績の公開</p>
                                        <p className="text-[11px] text-orange-900 leading-relaxed">
                                            本サービスを通じて制作されたウェブサイトの「所有権」および「管理権限」は当方に帰属します。また，当方は制作したウェブサイトを当方の制作実績として，本ウェブサイトやSNS等で公開できるものとし，ユーザーはこれに同意するものとします。ただし，ユーザーから事前の申し出があった場合は，実績公開を非公開とするよう誠実に努めます。
                                        </p>
                                    </div>
                                    <div className="border-t border-orange-200 pt-3">
                                        <p className="font-bold text-orange-800 mb-2 underline decoration-orange-200">2. ユーザー提供素材の責任</p>
                                        <p className="text-[11px] text-orange-900 leading-relaxed">
                                            ユーザーが本サービスに提供するテキスト，画像，ロゴ等の素材（以下「ユーザー素材」）について，ユーザーは第三者の著作権，肖像権，商標権等の権利を侵害していないことを保証するものとします。ユーザー素材に起因して第三者との紛争が生じた場合，ユーザーが自らの責任と費用で解決するものとし，当方は一切の責任を負いません。
                                        </p>
                                    </div>
                                    <div className="border-t border-orange-200 pt-3">
                                        <p className="font-bold text-orange-800 mb-1 underline decoration-orange-200">3. 契約終了後の扱い</p>
                                        <p className="text-[11px] text-orange-900">
                                            解約後は，ドメインおよびサイトデータの一切を譲渡する義務を当方は負わないものとします。
                                        </p>
                                    </div>
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <p className="font-bold text-blue-800 mb-2">4. ドメイン取得の追加料金</p>
                                    <div className="space-y-3 text-xs text-blue-900">
                                        <p>
                                            標準ドメイン以外のドメイン（.jp / .co.jp / .ai / .inc等）または短縮文字列・人気文字列等の希少ドメインを希望する場合，追加の取得実費および年次更新料が発生することにユーザーは同意するものとします（詳細は料金ページに準じる）。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第11条（支払遅延および未払い時の対応）</h2>
                            <div className="space-y-4 text-sm font-sans leading-relaxed">
                                <p>利用料金の支払いが滞った場合，当方はユーザーに対し，以下の段階的な措置を講じるものとし，ユーザーはこれに予め同意するものとします。</p>
                                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl space-y-6">
                                    <div className="space-y-2">
                                        <p className="font-bold text-red-800 flex items-center gap-2">
                                            <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-full">Phase 1</span>
                                            滞納 1日〜7日：機能制限（全会員対象）
                                        </p>
                                        <p className="text-xs text-red-900 ml-4 leading-relaxed">
                                            API（AI自動返信機能，インスタグラム連携，メニュー更新機能等）を利用したすべての機能および本サービスの主要な管理ツールの利用が即時停止されます。※WEB会員の場合，ウェブサイト自体の公開はこの期間に限り継続されますが，更新等は反映されません。
                                        </p>
                                    </div>

                                    <div className="space-y-2 border-t border-red-200 pt-4">
                                        <p className="font-bold text-red-800 flex items-center gap-2">
                                            <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-full">Phase 2</span>
                                            滞納 8日〜14日：サイト非公開
                                        </p>
                                        <p className="text-xs text-red-900 ml-4">
                                            ウェブサイトがインターネット上から非公開（アクセス不能状態）となり，管理画面へのすべてのログインが遮断されます。
                                        </p>
                                    </div>

                                    <div className="space-y-2 border-t border-red-200 pt-4">
                                        <p className="font-bold text-red-800 flex items-center gap-2">
                                            <span className="bg-red-200 text-red-800 text-[10px] px-2 py-0.5 rounded-full">Phase 3</span>
                                            滞納 15日：契約解除・権利喪失
                                        </p>
                                        <p className="text-xs text-red-900 ml-4">
                                            本契約は自動的に解除され，ユーザーはドメインの使用権，管理権，および制作されたウェブサイトのデータに対する一切の利用権限を喪失するものとします。
                                        </p>
                                    </div>

                                    <div className="space-y-2 border-t border-red-200 pt-4">
                                        <p className="font-bold text-red-800 flex items-center gap-2">
                                            <span className="bg-red-800 text-white text-[10px] px-2 py-0.5 rounded-full">Final Phase</span>
                                            滞納 31日：データ完全削除・ログイン不能（全会員対象）
                                        </p>
                                        <p className="text-xs text-red-900 ml-4 italic leading-relaxed">
                                            会員資格が完全に消滅し，アカウントへのログインが一切不能となります。サーバー内に蓄積されたすべての店舗データ，制作データ（WEB会員の場合），ドメイン設定は復旧不能な形式で完全に消去・削除されます。これによってユーザーに生じた損害について，当方は一切の責任を負いません。
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-500">
                                    ※カード決済失敗時の再決済処理はStripeの仕様に基づき自動で行われますが，上記期間は「最初の決済失敗日」を起算日とします。
                                </p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第12条（本サービスの提供の停止等）</h2>
                            <p className="text-sm leading-relaxed">
                                当方は，システムの保守点検，火災，停電，天災地変，または外部プラットフォームの障害等の理由により，ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとし，これによってユーザーに生じた不利益または損害について，一切の責任を負わないものとします。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第13条（保証の否認および免責事項）</h2>
                            <p className="text-sm leading-relaxed">
                                当方は，本サービスに事実上または法律上の瑕疵がないこと，および本サービスを利用することで特定の検索順位（MEO順位）の向上や実生活での集客・売上の増加を保証するものではありません。当方は，ユーザーが本サービスを利用したことにより生じたあらゆる損害について一切の責任を負いません。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第14条（本サービス内容の変更および再委託）</h2>
                            <div className="space-y-4 text-sm leading-relaxed">
                                <p>1. 当方は，ユーザーに通知することなく，本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし，これによってユーザーに生じた損害について一切の責任を負いません。</p>
                                <p>2. 当方は，本サービスに関する業務の全部または一部を，当方の責任において第三者に再委託することができるものとします。ユーザーはこれに予め同意するものとします。</p>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100 italic text-gray-400 text-xs">
                            <p className="font-bold mb-2">第15条（協議解決）</p>
                            <p>本規約に定めのない事項，または本規約の条項の解釈について疑義が生じた場合には，当方およびユーザーは誠意をもって協議し，解決を図るものとします。</p>
                        </div>

                        <div className="pt-8 mt-8 border-t-2 border-dashed border-gray-200">
                            <p className="font-bold text-gray-900">お問い合わせ先</p>
                            <p className="text-sm text-gray-600 mt-2">本規約に関するお問い合わせは，以下の窓口までお願いいたします。</p>
                            <p className="mt-4 p-6 bg-gray-50 rounded-2xl text-sm border border-gray-100">
                                Eメールアドレス：[メールアドレス]<br />
                                担当部署：契約・管理担当窓口
                            </p>
                        </div>
                    </section>
                </div>
            </main >
        </div >
    );
}
