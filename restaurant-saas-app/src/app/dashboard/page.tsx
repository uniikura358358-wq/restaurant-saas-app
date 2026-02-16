"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Sparkles, Loader2, Copy, RotateCcw, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToastContainer, useToast } from "@/components/ui/toast-custom";
import { AppSidebar } from "@/components/app-sidebar";
import ReviewReplyButton from "@/components/review-reply-button";
import { getDashboardStats, getReviews } from "@/app/actions/dashboard";
import { DashboardStats, FirestoreReview } from "@/types/firestore";

export default function DashboardPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  // Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Reviews State
  const [reviews, setReviews] = useState<FirestoreReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "replied">("pending");

  // Reply Input State
  const [replies, setReplies] = useState<{ [key: string]: string }>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const { toasts, addToast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, authLoading, router]);

  // ─── データ取得 (Server Actions) ───
  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const token = await getToken();
      if (!token) throw new Error("認証トークンが取得できませんでした");

      // 並行取得: Stats + Reviews
      // Phase 2: エラーが出ても画面を落とさない (Empty Stateを表示)
      try {
        const [statsData, reviewsData] = await Promise.all([
          getDashboardStats(token),
          getReviews(token, activeTab === "pending" ? "pending" : "replied", 20)
        ]);
        setStats(statsData);
        setReviews(reviewsData.reviews);
      } catch (innerError) {
        console.error("Data Fetch Error:", innerError);
        // データがない、または権限エラーの場合でも、空の状態として扱う
        setStats({
          totalReviews: 0,
          unrepliedCount: 0,
          repliedCount: 0,
          averageRating: 0,
          lowRatingCount: 0,
          updatedAt: new Date()
        });
        setReviews([]);
        if (innerError instanceof Error) {
          // 開発中は詳細を出すが、本番では穏便に
          if (process.env.NODE_ENV === "development") setError(innerError.message);
        }
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "データの読み込みに失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user, getToken, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── 保存機能 (Server API) ───
  const handleSaveReply = async (reviewId: string, content: string) => {
    if (!content.trim()) return;
    setSubmittingId(reviewId);

    try {
      const token = await getToken();
      if (!token) {
        addToast("ユーザー認証エラー: 再ログインしてください", "error");
        return;
      }

      // Phase 3で実装する Transaction API をコール
      const response = await fetch("/api/reviews/submit-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ reviewId, replyContent: content }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "保存に失敗しました");
      }

      addToast("返信を保存しました！");
      // リロードして最新化（またはOptimistic Update）
      await fetchData();

    } catch (err: any) {
      console.error(err);
      addToast(err.message || "保存できませんでした", "error");
    } finally {
      setSubmittingId(null);
    }
  };


  // ─── Utility ───
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast("コピーしました");
    } catch {
      addToast("コピーに失敗しました", "error");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 tracking-tight" style={{ overflowWrap: "break-word" }}>
      <ToastContainer toasts={toasts} />
      <div className="flex h-screen max-h-screen">
        <AppSidebar activePage="dashboard" />

        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">ダッシュボード</h1>
                <p className="text-sm text-muted-foreground">
                  店舗: {stats ? "データ連携済み (Firebase)" : "読み込み中..."}
                </p>
              </div>
              <div className="flex p-1 bg-muted rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === "pending"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  未返信
                </button>
                <button
                  onClick={() => setActiveTab("replied")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === "replied"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  返信済み
                </button>
              </div>
            </header>

            {/* KPI Dashboard (Stats from Firestore) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card p-5 rounded-xl shadow-sm border">
                <div className="text-muted-foreground text-sm font-bold mb-1">総口コミ数</div>
                <div className="text-3xl font-bold">{stats?.totalReviews ?? "-"} <span className="text-sm font-normal">件</span></div>
                <div className="text-xs text-muted-foreground mt-2">連携中</div>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-sm border">
                <div className="text-muted-foreground text-sm font-bold mb-1">平均スコア</div>
                <div className="text-3xl font-bold">{stats?.averageRating?.toFixed(1) ?? "-"} <span className="text-lg text-yellow-500">★</span></div>
                <div className="text-xs text-muted-foreground mt-2">星1-2: {stats?.lowRatingCount ?? 0}件</div>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-sm border">
                <div className="text-muted-foreground text-sm font-bold mb-1">未返信</div>
                <div className="text-3xl font-bold text-destructive">{stats?.unrepliedCount ?? "-"} <span className="text-sm font-normal">件</span></div>
                <div className="text-xs text-muted-foreground mt-2">対応が必要です</div>
              </div>
            </div>

            {(loading || authLoading) && reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
                <Loader2 className="size-10 animate-spin text-primary/40" />
                <p className="text-sm font-medium">データを読み込み中...</p>
              </div>
            ) : error ? (
              <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-xl text-destructive text-sm flex items-center gap-3">
                <XCircle className="size-4 shrink-0" />
                <span>エラーが発生しました: {error}</span>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-32 bg-background rounded-2xl border border-dashed flex flex-col items-center gap-2">
                <div className="bg-muted p-4 rounded-full mb-2">
                  <MessageCircle className="size-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {activeTab === "pending" ? "未返信の口コミはありません" : "返信済みの口コミはありません"}
                </p>
                <p className="text-xs text-muted-foreground">
                  (Firestoreにデータがない場合もここに表示されます)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {reviews.map((review) => (
                  <Card key={review.id} className={`shadow-sm hover:shadow-md transition-shadow overflow-hidden ${activeTab === "replied"
                    ? "border-l-4 border-l-emerald-500 border-t-0 border-r-0 border-b-0 ring-1 ring-emerald-200/50"
                    : "border-none ring-1 ring-black/5"
                    }`}>
                    <CardHeader className={`border-b py-4 ${activeTab === "replied" ? "bg-emerald-50/50" : "bg-muted/30"
                      }`}>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 min-w-0 flex-1">
                          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                            {review.author}
                            <Badge variant="outline" className="text-[10px] font-normal py-0">
                              {review.source}
                            </Badge>
                          </CardTitle>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{new Date(review.publishedAt as Date).toLocaleDateString("ja-JP")}</span>
                            <span className="flex text-amber-400 font-bold">
                              {"★".repeat(review.rating)}
                            </span>
                            {activeTab === "replied" && review.updatedAt && (
                              <span className="text-emerald-600 font-medium">
                                更新日: {new Date(review.updatedAt as Date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                        {activeTab === "replied" ? (
                          <Badge className="text-[11px] font-bold px-2.5 py-1 shrink-0 ml-2 bg-emerald-100 text-emerald-700 border border-emerald-300">
                            <CheckCircle className="size-3.5 mr-1" />
                            返信済み
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] font-bold px-2 py-0.5 shrink-0 ml-2">
                            未返信
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="py-5 space-y-5">
                      <p className="text-sm leading-relaxed text-foreground/90" style={{ overflowWrap: "break-word", whiteSpace: "pre-wrap" }}>
                        {review.content}
                      </p>

                      {activeTab === "pending" && replies[review.id] && (
                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                              <Sparkles className="size-3.5" />
                              <span>AI 生成の返信案</span>
                            </div>
                          </div>
                          <textarea
                            value={replies[review.id]}
                            onChange={(e) => setReplies(prev => ({ ...prev, [review.id]: e.target.value }))}
                            className="w-full min-h-[120px] p-3 text-sm leading-relaxed font-medium text-foreground bg-background border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => copyToClipboard(replies[review.id])}>
                              コピー
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setReplies(prev => {
                              const next = { ...prev };
                              delete next[review.id];
                              return next;
                            })}>
                              破棄
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 返信済み内容の表示はAPIでreviewに含めるか、別途取得か。今回はsummaryを使用 */}
                      {activeTab === "replied" && review.replySummary && (
                        <div className="p-5 rounded-2xl bg-muted/50 border space-y-3">
                          <p className="text-sm text-foreground/70 italic" style={{ overflowWrap: "break-word", whiteSpace: "pre-wrap" }}>
                            {review.replySummary}
                          </p>
                          <div className="flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(review.replySummary!)}>
                              <Copy className="size-3 mr-1.5" /> コピー
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>

                    {activeTab === "pending" && !replies[review.id] && (
                      <div className="px-6 py-4 bg-muted/10 border-t flex justify-end">
                        <ReviewReplyButton
                          reviewText={review.content}
                          customerName={review.author}
                          rating={review.rating}
                          onReplyGenerated={(reply) => setReplies(prev => ({ ...prev, [review.id]: reply }))}
                          className="rounded-lg"
                        />
                      </div>
                    )}

                    {/* 保存ボタン (AI生成後) */}
                    {activeTab === "pending" && replies[review.id] && (
                      <div className="px-6 py-4 bg-white border-t flex justify-end">
                        <Button
                          onClick={() => handleSaveReply(review.id, replies[review.id])}
                          disabled={submittingId === review.id}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          {submittingId === review.id ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
                          {submittingId === review.id ? "保存中..." : "返信を保存して完了"}
                        </Button>
                      </div>
                    )}

                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
