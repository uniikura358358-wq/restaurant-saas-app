'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Lock, Eye, Database, Globe } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lock className="w-6 h-6 text-blue-600" />
                        <h1 className="text-xl font-black text-gray-900">プライバシーポリシー</h1>
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
                            [運営者名/会社名]（以下，「当方」といいます。）は，本ウェブサイト上で提供するサービス「MogMog」（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
                        </p>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <Database className="w-5 h-5 text-blue-600" />
                                第1条（個人情報の収集方法と項目）
                            </h2>
                            <p>
                                当方は，ユーザーが利用登録をする際に以下の個人情報を取得します。
                            </p>
                            <ul className="list-disc list-inside mt-2 space-y-2 ml-4 text-sm">
                                <li><strong>基本情報：</strong>氏名，メールアドレス，電話番号，店舗名，所在地，役職等のプロフィール情報</li>
                                <li><strong>自動収集：</strong>IPアドレス，ブラウザ情報，アクセスログ，Cookie（クッキー）情報</li>
                                <li><strong>API連携情報：</strong>Google Business ProfileおよびInstagram API経由で取得する口コミ文面，評価点数，投稿写真，アカウントインサイト，返信履歴</li>
                            </ul>
                            <p className="mt-4 text-sm bg-blue-50 p-4 rounded-xl border border-blue-100">
                                当方は，これらの情報を適切に管理し，不正アクセスや紛失，漏洩の防止のためにSSL/TLSによる暗号化通信やデータベースの多重防御等の安全管理措置を講じています。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <Eye className="w-5 h-5 text-green-600" />
                                第2条（個人情報の保存期間と廃棄）
                            </h2>
                            <p>
                                当方は，個人情報の収集・利用目的を達成するために必要な期間，または法令により定められた期間，ユーザーの個人情報を保存します。保存期間が終了した情報，またはユーザーからの削除請求に基づき利用の必要がなくなった情報は，復元不可能な方法（シュレッダー処理，磁気的消去等）により速やかに廃棄・消去します。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <Eye className="w-5 h-5 text-green-600" />
                                第3条（個人情報を収集・利用する目的）
                            </h2>
                            <p>当方が個人情報を収集・利用する目的は，以下のとおりです。</p>
                            <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                                <li>本サービスの提供・運営のため</li>
                                <li>AIによる口コミ返信案や画像生成等の機能提供のため</li>
                                <li>ユーザーからの重要なお知らせやお問い合わせへの回答のため</li>
                                <li><strong>当方が提供する他サービス，または新規事業に関する情報提供・広告配信（メールマガジン等）のため</strong></li>
                                <li>利用規約に違反したユーザーの特定や，不正・不当な目的での利用を拒否するため</li>
                                <li>ユーザー自身の登録情報の閲覧や変更，利用状況の閲覧を行っていただくため</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-4">
                                <Globe className="w-5 h-5 text-purple-600" />
                                第4条（データの利活用とAIモデルへの利用について）
                            </h2>
                            <div className="space-y-4">
                                <p>
                                    本サービスでは，サービスの利便性向上および高度な経営分析機能の提供のため，収集したデータ（売上データ，口コミ解析結果等）を以下の範囲で利用することがあります。
                                </p>
                                <div className="bg-purple-50 p-5 rounded-2xl border-2 border-purple-100">
                                    <p className="text-sm font-black text-purple-800 mb-2">【売上データ・解析データの扱い】</p>
                                    <ul className="list-disc list-inside space-y-2 text-xs text-purple-900">
                                        <li>収集された売上データや店舗パフォーマンスデータは，当方が多角的に展開する関連事業の市場調査，または統計的なアルゴリズム構築の基礎資料として保有・利用されるものとします。</li>
                                        <li>特定の個人や個別の加盟店名が特定される形で第三者に公開されることはありませんが，プラットフォーム全体の統計レポートやケーススタディとして活用される可能性があることをユーザーは承諾するものとします。</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第5条（個人情報の第三者提供）</h2>
                            <p>
                                当方は，次に掲げる場合を除いて，あらかじめユーザーの同意を得ることなく，第三者に個人情報を提供することはありません。ただし，個人情報保護法その他の法令で認められる場合を除きます。
                            </p>
                            <ul className="list-decimal list-inside mt-2 space-y-1 ml-4 text-sm">
                                <li>人の生命，身体または財産の保護のために必要がある場合であって，本人の同意を得ることが困難であるとき</li>
                                <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって，本人の同意を得ることが困難であるとき</li>
                                <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって，本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第6条（個人情報の開示・訂正・利用停止）</h2>
                            <p>
                                ユーザーは，当方の保有する自己の個人情報が誤った情報である場合には，当方が定める手続きにより，個人情報の訂正，追加または削除を請求することができます。当方は，ユーザーから請求を受け，その請求に応じる必要があると判断した場合には，遅滞なく当該個人情報の開示，訂正等を行うものとします。
                            </p>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第7条（Cookieおよびアクセス解析について）</h2>
                            <div className="space-y-4 text-sm leading-relaxed">
                                <p>本サービスでは，サービスの利便性向上およびアクセス状況の把握のために，Cookieおよびこれに類する技術を利用しています。また，Google Analytics等の外部サービスを使用し，匿名化された統計データを収集しております。</p>
                                <p>ユーザーは，ブラウザの設定によりCookieの受け入れを拒否することができますが，その場合，本サービスの一部機能が正常に動作しない可能性があることを予めご了承ください。</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-black text-gray-900 mb-4">第8条（プライバシーポリシーの変更）</h2>
                            <p>
                                本ポリシーの内容は，法令その他本ポリシーに別段の定めのある事項を除いて，ユーザーに通知することなく，変更することができるものとします。当方が別途定める場合を除いて，変更後のプライバシーポリシーは，本ウェブサイトに掲載したときから効力を生じるものとします。
                            </p>
                        </div>

                        <div className="pt-8 border-t border-gray-100 text-sm">
                            <p className="font-bold">お問い合わせ窓口</p>
                            <p>本ポリシーに関するお問い合わせは，下記の窓口までお願いいたします。</p>
                            <p className="mt-2">
                                [運営者名/会社名]<br />
                                Eメールアドレス：[メールアドレス]
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
