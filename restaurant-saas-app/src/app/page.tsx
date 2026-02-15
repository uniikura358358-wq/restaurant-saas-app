'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import ReviewReplyButton from '@/components/ReviewReplyButton';
import supabase from "@/lib/supabase";
import { useAuth } from '@/hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// ---------------------------------------------------------
// Types: Supabase Reviews Table Definition
// ---------------------------------------------------------
interface Review {
  id: number;
  author: string;
  rating: number;
  date: string; // or created_at
  text: string; // content
  reply: string; // reply_content
  status: string; // 'unreplied' | 'replied'
  source?: string;
}

export default function Dashboard() {
  // Auth Check
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // State Management
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'replied'>('pending');
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  // Firestore Actions
  const { saveReply, getAllReplies } = require('@/lib/db-actions');

  // データ取得関数
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Supabase からレビュー本体を取得
      let query = supabase.from("reviews").select("*");

      // Note: Firestoreとの併用のため、Supabase側のステータスフィルタリングは
      // Firestoreのデータ次第で不正確になる可能性があるが、
      // 一旦はSupabaseのステータスを信じて取得し、その後Firestoreデータで補正する方針とする。
      // ただし、'pending' タブで Firestore に返信がある場合は除外する等の処理が必要。

      if (activeTab === "pending") {
        query = query.or("status.is.null,status.neq.replied");
      } else {
        query = query.eq("status", "replied").order("updated_at", { ascending: false }).limit(20);
      }

      const { data: supabaseData, error } = await query;
      if (error) throw error;

      // 2. Firestore から返信データを取得
      // ユーザーIDでフィルタリング
      const firestoreReplies = await getAllReplies(user?.uid);

      // 3. データをマージして整形
      const formattedReviews: Review[] = (supabaseData || []).map((row: any) => {
        const firestoreReply = firestoreReplies[String(row.id)];

        // Firestore に返信があれば、そちらを優先
        const replyContent = firestoreReply || row.reply_content || "";
        // Firestore に返信があれば、ステータスは 'replied' とみなす
        const status = firestoreReply ? 'replied' : (row.status || "unreplied");

        return {
          id: row.id,
          author: row.author || "不明なユーザー",
          rating: row.rating || 0,
          date: row.date || row.created_at?.split("T")[0] || "",
          text: row.text || row.content || "",
          reply: replyContent,
          status: status,
          source: row.source
        };
      });

      // 4. タブに応じたフィルタリング (クライアントサイド補正)
      // Supabaseのクエリだけでは Firestore の状態を反映できていない場合があるため
      const filteredReviews = formattedReviews.filter(review => {
        if (activeTab === 'pending') {
          return review.status !== 'replied';
        } else {
          // repliedタブの場合は、Supabaseで絞り込んでいるか、
          // もしSupabaseでpendingでもFirestoreにあれば表示したいが、
          // 上記クエリだとSupabaseでrepliedのものしか取ってこないため、
          // Firestoreのみでrepliedになったものが表示されない可能性がある。
          // -> 本格対応するなら Supabase 側も更新するか、全件取得が必要。
          // 今回は handleSaveReply で Supabase も更新するため、ズレは一時的と仮定する。
          return review.status === 'replied';
        }
      });

      setReviews(filteredReviews);
    } catch (err) {
      console.error(err);
      toast.error("データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [activeTab, user]);

  // 初回ロード & タブ切り替え時にフェッチ
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // 特定のレビューIDに対して返信文を更新する関数
  const handleReplyUpdate = (id: number, newReply: string) => {
    setReviews(prev => prev.map(review =>
      review.id === id ? { ...review, reply: newReply } : review
    ));
  };

  // クリップボードにコピーする関数
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("クリップボードにコピーしました"))
      .catch(() => toast.error("コピーに失敗しました"));
  };

  // 返信を保存する関数
  const handleSaveReply = async (reviewId: number, content: string) => {
    if (!content.trim()) return;
    setSubmittingId(reviewId);

    try {
      if (!user?.uid) {
        toast.error("ユーザー認証エラー: 再ログインしてください");
        return;
      }

      // 1. Firestore に保存
      await saveReply(reviewId, content, user.uid);

      // 2. Supabase & Google にも保存 (同期)
      // これにより Supabase の status も 'replied' になり、次回のクエリで整合性が取れる
      const response = await fetch("/api/reviews/submit-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, replyContent: content }),
      });

      if (!response.ok) {
        // API失敗してもFirestoreには保存できているので、完全にエラーとはしないが警告は出す
        console.warn("Supabase/Google sync failed");
        toast.warning("保存しましたが、Googleへの反映に失敗した可能性があります");
      } else {
        toast.success("返信を保存しました！");
      }

      await fetchReviews();

    } catch (err) {
      console.error(err);
      toast.error("保存できませんでした");
    } finally {
      setSubmittingId(null);
    }
  };

  // Auth Loading
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">読み込み中...</div>;
  }

  // Not Logged In (Redirecting handled by useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-indigo-700 flex items-center gap-2">
          <span>🍽️</span> Restaurant SaaS <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Beta</span>
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">店舗: <b>イタリアン SATO</b></span>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">👤</div>
          <button
            onClick={() => signOut(auth)}
            className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded border border-red-200 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg w-fit mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'pending' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            未返信 ({activeTab === 'pending' ? reviews.length : '-'})
          </button>
          <button
            onClick={() => setActiveTab('replied')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'replied' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            返信済み
          </button>
        </div>

        {/* 2. KPI Dashboard (Simplified Dynamic Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-bold mb-1">表示中の口コミ</div>
            <div className="text-3xl font-bold text-gray-800">{reviews.length} <span className="text-sm font-normal">件</span></div>
            <div className="text-xs text-gray-400 mt-2">{activeTab === 'pending' ? '要対応' : '対応済み'}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-bold mb-1">平均スコア</div>
            <div className="text-3xl font-bold text-gray-800">4.2 <span className="text-lg text-yellow-500">★</span></div>
            <div className="text-xs text-green-600 mt-2">↑ 先月比 +0.3</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-gray-500 text-sm font-bold mb-1">今月の口コミ</div>
            <div className="text-3xl font-bold text-gray-800">12 <span className="text-sm font-normal">件</span></div>
            <div className="text-xs text-gray-400 mt-2">全期間: 1,240件</div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
          {activeTab === 'pending' ? '📢 未返信の口コミ' : '✅ 返信済みの口コミ'}
        </h2>

        {/* 3. Review List */}
        {loading ? (
          <div className="text-center py-20 text-gray-500">読み込み中...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500">表示する口コミはありません</p>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Review Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-lg">{review.author}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">{review.date}</span>
                      {review.source && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">{review.source}</span>}
                    </div>
                    <div className="text-yellow-500 flex text-sm">
                      {'★'.repeat(review.rating)}
                      <span className="text-gray-300">{'★'.repeat(5 - review.rating)}</span>
                    </div>
                  </div>
                  {review.status === 'replied' ? (
                    <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">返信済み</span>
                  ) : (
                    <span className="bg-red-100 text-red-700 text-xs px-3 py-1 rounded-full font-bold animate-pulse">未返信</span>
                  )}
                </div>

                {/* Review Body */}
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg mb-6 text-sm leading-relaxed whitespace-pre-wrap">
                  {review.text}
                </p>

                {/* Action Area */}
                <div className="border-t pt-5">
                  {activeTab === 'pending' ? (
                    <>
                      <div className="mb-3">
                        <ReviewReplyButton
                          reviewText={review.text}
                          customerName={review.author}
                          rating={review.rating}
                          onReplyGenerated={(reply) => handleReplyUpdate(review.id, reply)}
                        />
                      </div>

                      {/* Reply Editor */}
                      <div className="relative group">
                        <textarea
                          className="w-full border border-gray-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px] transition-all bg-white"
                          placeholder="AIボタンを押すと、ここに返信案が自動入力されます..."
                          value={review.reply}
                          onChange={(e) => handleReplyUpdate(review.id, e.target.value)}
                        />
                        {review.reply && (
                          <div className="absolute bottom-4 right-4 flex gap-2">
                            <button
                              onClick={() => handleCopy(review.reply)}
                              className="bg-gray-200 text-gray-700 text-xs px-3 py-2 rounded font-bold hover:bg-gray-300 transition"
                            >
                              コピー
                            </button>
                            <button
                              onClick={() => handleSaveReply(review.id, review.reply)}
                              disabled={submittingId === review.id}
                              className="bg-indigo-600 text-white text-xs px-4 py-2 rounded font-bold hover:bg-indigo-700 transition shadow-sm disabled:bg-gray-400"
                            >
                              {submittingId === review.id ? '保存中...' : '保存して完了'}
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // 返信済みの場合の表示
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <p className="text-xs text-green-700 font-bold mb-2">返信内容:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.reply}</p>
                      <div className="mt-2 flex justify-end">
                        <button
                          onClick={() => handleCopy(review.reply)}
                          className="text-xs text-green-600 hover:underline"
                        >
                          コピーする
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}