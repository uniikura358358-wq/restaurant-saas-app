"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Sparkles, Loader2, Copy, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { useAdminDebug } from "@/context/AdminDebugContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import ReviewReplyButton from "@/components/review-reply-button";
import { getDashboardStats, getReviews, submitReply } from "@/app/actions/dashboard";
import { DashboardStats, FirestoreReview, Announcement } from "@/types/firestore";

export default function DashboardPage() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  // Stats State
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Reviews State
  const [reviews, setReviews] = useState<FirestoreReview[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: "1",
      title: "システムメンテナンスのお知らせ",
      content: "2026年3月1日午前2:00〜4:00まで、データベースのアップグレードに伴いサービスを一時停止いたします。",
      createdAt: new Date(),
      isRead: false
    },
    {
      id: "2",
      title: "新機能：AI返信の自動修正機能が追加されました",
      content: "生成された返信案をさらに自然な日本語に修正するAIアドバイザー機能がプレミアムプランで利用可能になりました。",
      createdAt: new Date(Date.now() - 86400000),
      isRead: true
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "replied">("pending");

  // Reply Input State
  const [replies, setReplies] = useState<{ [key: string]: string }>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [sentReviewId, setSentReviewId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [hiddenReviewIds, setHiddenReviewIds] = useState<Set<string>>(new Set());


  const { simulatedPlan } = useAdminDebug();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, authLoading, router]);

  // プラン偽装 (Simulated Plan) の変更を検知して即座に再取得
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [simulatedPlan, user]); // fetchData は useCallback 内で定義されているため安定

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
          aiUsage: {
            text: { sent: 0, limit: 0, remaining: 0 },
            image: { sent: 0, limit: 0, remaining: 0 }
          },
          planName: "",
          storeName: "",
          nextPaymentDate: null,
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

    // 【楽観的更新】即座にリストから隠す
    setHiddenReviewIds(prev => new Set(prev).add(reviewId));
    setSubmittingId(reviewId);

    try {
      const token = await getToken();
      if (!token) {
        toast.error("ユーザー認証エラー: 再ログインしてください");
        return;
      }

      // Server Action を使用して保存
      const result = await submitReply(token, reviewId, content);

      if (!result.success) {
        throw new Error("保存に失敗しました");
      }

      // 成功通知の表示
      setSentReviewId(reviewId);
      setTimeout(() => setSentReviewId(null), 3000);
      toast.success("返信を送信しました");

      // 統計の楽観的更新 (UIの反映を速める)
      setStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          unrepliedCount: Math.max(0, prev.unrepliedCount - 1),
          repliedCount: prev.repliedCount + 1,
          aiUsage: prev.aiUsage ? {
            ...prev.aiUsage,
            text: {
              ...prev.aiUsage.text,
              sent: prev.aiUsage.text.sent + 1,
              remaining: Math.max(0, prev.aiUsage.text.remaining - 1)
            }
          } : prev.aiUsage
        };
      });
      // 入力状態のリセット
      setReplies(prev => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });

      // 最新状態への同期 (念押し)
      await fetchData();

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "保存できませんでした");
      // エラー時は非表示を解除
      setHiddenReviewIds(prev => {
        const next = new Set(prev);
        next.delete(reviewId);
        return next;
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSyncReviews = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("認証トークンが取得できませんでした");

      const response = await fetch("/api/reviews/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "同期に失敗しました");
      }

      const data = await response.json();
      toast.success(data.message || "同期が完了しました");
      // 同期後にデータを再フェッチ
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "同期中または設定に問題があります");
    } finally {
      setSyncing(false);
    }
  };

  // ─── Utility ───
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("コピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 tracking-tight" style={{ overflowWrap: "break-word" }}>
      <div className="flex h-screen max-h-screen">
        <AppSidebar
          activePage="dashboard"
          user={user}
          stats={stats}
          announcements={announcements}
        />

        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">ダッシュボード</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground font-medium">
                    店舗: {stats?.storeName || (loading ? "読み込み中..." : "未設定")}
                  </p>
                  {stats?.planName && (
                    <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-none">
                      {stats.planName}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncReviews}
                  disabled={syncing || loading}
                  className="bg-background shadow-sm h-9"
                >
                  {syncing ? <Loader2 className="size-4 animate-spin mr-2" /> : <RotateCcw className="size-4 mr-2" />}
                  口コミを同期
                </Button>

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
              </div>
            </header>

            {/* KPI Dashboard (Stats from Firestore) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-card p-5 rounded-xl shadow-sm border">
                <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">総口コミ数</div>
                <div className="text-3xl font-black">{stats?.totalReviews ?? "-"} <span className="text-xs font-medium opacity-50">件</span></div>
                <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> 同期済み
                </div>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-sm border">
                <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">平均スコア</div>
                <div className="text-3xl font-black">{stats?.averageRating?.toFixed(1) ?? "-"} <span className="text-lg text-yellow-500">★</span></div>
                <div className="text-[10px] text-muted-foreground mt-2 font-bold text-destructive/80">
                  星1-2: {stats?.lowRatingCount ?? 0}件 (要警戒)
                </div>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-sm border ring-2 ring-primary/20">
                <div className="text-primary text-[10px] font-black uppercase tracking-widest mb-1">未返信 (対応中)</div>
                <div className="text-3xl font-black text-primary">{stats?.unrepliedCount ?? "-"} <span className="text-xs font-medium opacity-50">件</span></div>
                <div className="text-[10px] text-primary/70 mt-2 font-bold">
                  至急対応が必要です
                </div>
              </div>
              <div className="bg-card p-5 rounded-xl shadow-sm border border-emerald-100/50">
                <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">AI 返信案作成 (残枠)</div>
                <div className="text-3xl font-black">
                  {stats?.aiUsage?.text ? `${stats.aiUsage.text.remaining}` : "-"}
                  <span className="text-xs font-medium opacity-50"> / {stats?.aiUsage?.text?.limit ?? "-"}</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-1000"
                    style={{ width: `${stats?.aiUsage?.text ? (stats.aiUsage.text.sent / stats.aiUsage.text.limit) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="bg-card p-5 rounded-xl shadow-sm border border-indigo-100/50">
                <div className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">AI 画像生成 (残枠)</div>
                <div className="text-3xl font-black">
                  {stats?.aiUsage?.image ? `${stats.aiUsage.image.remaining}` : "-"}
                  <span className="text-xs font-medium opacity-50"> / {stats?.aiUsage?.image?.limit ?? "-"}</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-1000"
                    style={{ width: `${stats?.aiUsage?.image ? (stats.aiUsage.image.sent / stats.aiUsage.image.limit) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {(loading || authLoading) && reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
                <Loader2 className="size-10 animate-spin text-primary/40" />
                <p className="text-sm font-medium">データを読み込み中...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col gap-4">
                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-xl text-destructive text-sm flex items-center gap-3">
                  <XCircle className="size-4 shrink-0" />
                  <span>エラーが発生しました: {error}</span>
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    className="text-muted-foreground border-border hover:bg-muted"
                    onClick={() => {
                      localStorage.removeItem("demo_user");
                      localStorage.removeItem("simulatedPlan");
                      router.push("/login");
                      window.location.reload();
                    }}
                  >
                    Clear Session & Login
                  </Button>
                </div>
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
                {reviews.filter(r => !hiddenReviewIds.has(r.id)).map((review) => (
                  <Card key={review.id} className={`shadow-sm hover:shadow-md transition-shadow relative ${activeTab === "replied"
                    ? "border-l-4 border-l-emerald-500 border-t-0 border-r-0 border-b-0 ring-1 ring-emerald-500/20"
                    : "border-none ring-1 ring-foreground/5"
                    }`}>
                    <CardHeader className={`border-b py-4 ${activeTab === "replied" ? "bg-emerald-500/5 dark:bg-emerald-500/10" : "bg-muted/30"
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
                          <Badge className="text-[11px] font-bold px-2.5 py-1 shrink-0 ml-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
                      <div className="px-6 py-4 bg-card border-t flex justify-end">
                        <div className="relative">
                          {sentReviewId === review.id && (
                            <div className="absolute bottom-full right-0 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500 z-50">
                              <div className="bg-card border border-primary/20 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2.5 whitespace-nowrap">
                                <div className="bg-primary rounded-full p-1">
                                  <CheckCircle className="size-3 text-white" />
                                </div>
                                <span className="text-xs font-bold text-foreground">送信完了しました！</span>
                              </div>
                            </div>
                          )}
                          <Button
                            onClick={() => handleSaveReply(review.id, replies[review.id])}
                            disabled={submittingId === review.id}
                            className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-md transition-all active:scale-95"
                          >
                            {submittingId === review.id ? <Loader2 className="animate-spin size-5 mr-2" /> : <CheckCircle className="size-5 mr-2" />}
                            {submittingId === review.id ? "送信中..." : "Googleに返信を送信"}
                          </Button>
                        </div>
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
