import React from 'react';
import { TrendingUp, BarChart3, ChevronRight, Sparkles } from 'lucide-react';

export const RevenueMaximizationBanner = () => {
    return (
        <div className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/40 border border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <TrendingUp className="w-40 h-40 text-white transform rotate-12" />
            </div>

            <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold mb-4 border border-indigo-500/30">
                    <BarChart3 className="w-3 h-3" />
                    REPEATER ANALYSIS PREVIEW
                </div>
                <h3 className="text-2xl font-black text-white mb-2 text-left">
                    データ連携で「真の収益」を可視化。
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed mb-8 text-left">
                    レジや決済端末を連携させることで、複数の支払い手段（カード・QR・現金）をAIが自動で突合。<br />
                    これまで不可能だった「正確なリピーター率」と「離脱予備軍」を特定し、収益化を加速させます。
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Airレジ 導線 */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer group/btn overflow-hidden relative">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs">Air</div>
                            <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">紹介料獲得!</div>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1 text-left relative z-10">Airレジと連携</h4>
                        <p className="text-[10px] text-gray-400 text-left mb-4 relative z-10">日本トップシェア。売上・顧客データを自動的に吸い上げます。</p>
                        <button className="w-full py-2.5 rounded-xl bg-white/10 text-white text-[11px] font-black group-hover/btn:bg-white/20 transition-all relative z-10">
                            詳細・お申し込み
                        </button>
                    </div>

                    {/* Square 導線 */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group/btn overflow-hidden relative">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs">Sq</div>
                            <div className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold">最短当日開始</div>
                        </div>
                        <h4 className="text-white font-bold text-sm mb-1 text-left relative z-10">Squareと連携</h4>
                        <p className="text-[10px] text-gray-400 text-left mb-4 relative z-10">オシャレな決済端末。審査が速く、即座にリピーター特定を開始。</p>
                        <button className="w-full py-2.5 rounded-xl bg-white/10 text-white text-[11px] font-black group-hover/btn:bg-white/20 transition-all relative z-10">
                            詳細・お申し込み
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex items-center gap-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <ChevronRight className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-white mb-0.5">上位プランへのアップグレードで全機能を解放</p>
                        <p className="text-[10px] text-indigo-200/60">POSレジ自動連携・100%個客特定・離脱客へのAI自動フォロー機能</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
