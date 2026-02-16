'use client';

import LoginForm from './login-form';
import { motion } from 'framer-motion';
import { Star, Shield, Zap, TrendingUp } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white selection:bg-indigo-100">
            {/* Left Side: Brand & Visuals */}
            <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative z-10"
                >
                    <div className="flex items-center gap-3 mb-8">
                        <span className="text-4xl">🍽️</span>
                        <h1 className="text-3xl font-black tracking-tight">Restaurant SaaS AI</h1>
                    </div>

                    <h2 className="text-5xl font-extrabold leading-tight mb-8">
                        飲食店の口コミ対応を、<br />
                        <span className="text-indigo-200">AIでもっとスマートに。</span>
                    </h2>

                    <div className="space-y-6">
                        <FeatureItem
                            icon={<Zap className="w-5 h-5 text-yellow-400" />}
                            title="爆速AI返信生成"
                            desc="Gemini Proを活用し、数秒で丁寧な返答を作成します。"
                        />
                        <FeatureItem
                            icon={<Shield className="w-5 h-5 text-green-400" />}
                            title="公式Whop連携"
                            desc="安全な決済とメンバーシップ管理を提供します。"
                        />
                        <FeatureItem
                            icon={<TrendingUp className="w-5 h-5 text-blue-400" />}
                            title="MEO対策の最適化"
                            desc="返信率を100%に保ち、Googleマップの順位向上に貢献。"
                        />
                    </div>
                </motion.div>

                <div className="mt-20 pt-10 border-t border-white/10 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-gray-200" />
                            ))}
                        </div>
                        <p className="text-sm text-indigo-100">
                            <span className="font-bold">100+</span> 以上の店舗様にご利用いただいています
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="flex flex-col items-center justify-center p-8 lg:p-12 bg-gray-50/50">
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="max-w-md w-full"
                >
                    <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
                        <span className="text-3xl">🍽️</span>
                        <h1 className="text-2xl font-bold text-gray-900">Restaurant SaaS AI</h1>
                    </div>

                    <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100">
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">おかえりなさい</h2>
                            <p className="text-gray-500">アカウントにログインして管理を開始しましょう</p>
                        </div>

                        <LoginForm />

                        <div className="mt-8 pt-8 border-t border-gray-100 text-center">
                            <p className="text-sm text-gray-500">
                                アカウントをお持ちでないですか？ <br />
                                <a href="/plans" className="text-indigo-600 font-bold hover:underline">プランを選択して開始する</a>
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400">
                        <a href="#" className="hover:text-gray-600">利用規約</a>
                        <a href="#" className="hover:text-gray-600">プライバシーポリシー</a>
                        <a href="#" className="hover:text-gray-600">特定商取引法に基づく表記</a>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 p-2 bg-white/10 rounded-lg">
                {icon}
            </div>
            <div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-indigo-100/70 text-sm">{desc}</p>
            </div>
        </div>
    );
}