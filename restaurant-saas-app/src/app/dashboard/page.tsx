"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageCircle, Sparkles, Loader2, Copy, RotateCcw, CheckCircle, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import supabase from "@/lib/supabase";
import { ToastContainer, useToast } from "@/components/ui/toast-custom";
import { AppSidebar } from "@/components/app-sidebar";
import ReviewReplyButton from "@/components/review-reply-button";

interface Review {
  id: number;
  author: string;
  rating: number;
  source: string;
  content?: string;
  comment?: string;
  review_text?: string;
  text?: string;
  body?: string;
  status: string;
  reply_content?: string;
  created_at: string;
  updated_at?: string;
}

export default function DashboardPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingFor, setSubmittingFor] = useState<number | null>(null);
  const [resettingFor, setResettingFor] = useState<number | null>(null);
  // unused state removed
  const [activeTab, setActiveTab] = useState<"pending" | "replied">("pending");
  const [replies, setReplies] = useState<{ [key: number]: string }>({});

  const { toasts, addToast } = useToast();

  // ─── データ取得 ───
  const fetchReviews = useCallback(async (tab: "pending" | "replied") => {
    try {
      setLoading(true);
      setError(null);

      let query;
      if (tab === "pending") {
        // 未返信: status が 'replied' でない全レコード（NULL含む）
        query = supabase
          .from("reviews")
          .select("*")
          .or("status.is.null,status.neq.replied");
      } else {
        // 返信済み: status が 'replied' のレコードを最新順で最大20件
        query = supabase
          .from("reviews")
          .select("*")
          .eq("status", "replied")
          .limit(20);
      }

      const { data, error: supabaseError } = await query.order("created_at", { ascending: false });

      if (supabaseError) throw supabaseError;
      setReviews((data as Review[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "データの読み込みに失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(activeTab);
  }, [activeTab, fetchReviews]);

  /* Refactored to ReviewReplyButton component
  const handleGenerateReply = async (review: Review) => {
      // ... logic moved to component ...
  };
  */

  // ─── 返信保存: reply_content に保存 + status を 'replied' に更新 ───
  const handleSubmitReply = async (reviewId: number) => {
    const replyContent = replies[reviewId];
    if (!replyContent) return;
    if (submittingFor !== null) return; // 二重送信防止

    if (replyContent.length > 300) {
      addToast("返信内容が300文字を超えています。短くしてください。", "warning");
      return;
    }

    try {
      setSubmittingFor(reviewId);
      const response = await fetch("/api/reviews/submit-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, replyContent }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || "返信の保存に失敗しました");
      }

      // UIからカードを消して返信データもクリア
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReplies((prev) => {
        const next = { ...prev };
        delete next[reviewId];
        return next;
      });

      addToast("返信完了しました ✅ 返信済みタブで確認できます");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      addToast(message, "error");
    } finally {
      setSubmittingFor(null);
    }
  };

  // ─── 未返信に戻す: status を 'unreplied' に、reply_content を null に ───
  const handleResetStatus = async (reviewId: number) => {
    if (resettingFor !== null) return;
    try {
      setResettingFor(reviewId);
      const response = await fetch("/api/reviews/reset-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ステータスの復元に失敗しました");
      }

      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      addToast("未返信に戻しました");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "復元に失敗しました";
      addToast(message, "error");
    } finally {
      setResettingFor(null);
    }
  };

  // ─── コピー機能（日本語トースト通知付き） ───
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast("コピーしました");
    } catch {
      addToast("コピーに失敗しました", "error");
    }
  };

  const getReviewText = (review: Review) => {
    return review.review_text || review.content || review.comment || review.text || review.body || "（口コミ内容がありません）";
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 tracking-tight" style={{ overflowWrap: "break-word" }}>
      <ToastContainer toasts={toasts} />
      <div className="flex h-screen max-h-screen">
        {/* サイドバー */}
        <AppSidebar activePage="dashboard" />

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
            {/* ヘッダー + タブUI */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">ダッシュボード</h1>
                <p className="text-sm text-muted-foreground">
                  AIによる返信作成と履歴管理
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

            {/* ローディング / エラー / 空状態 */}
            {loading && reviews.length === 0 ? (
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
                  {activeTab === "pending" ? "すべての対応が完了しました 🎉" : "まだ返信を保存していません"}
                </p>
              </div>
            ) : (
              /* ─── レビューカード一覧 ─── */
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
                            <span>{new Date(review.created_at).toLocaleDateString("ja-JP")}</span>
                            <span className="flex text-amber-400 font-bold">
                              {"★".repeat(review.rating)}
                            </span>
                            {/* 返信済みタブ: 返信日時を表示 */}
                            {activeTab === "replied" && review.updated_at && (
                              <span className="text-emerald-600 font-medium">
                                返信日: {new Date(review.updated_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* ステータスバッジ: 返信済み=グリーン、未返信=赤(destructive) */}
                        {activeTab === "replied" ? (
                          <Badge
                            className="text-[11px] font-bold px-2.5 py-1 shrink-0 ml-2 bg-emerald-100 text-emerald-700 border border-emerald-300"
                          >
                            <CheckCircle className="size-3.5 mr-1" />
                            返信済み
                          </Badge>
                        ) : (
                          <Badge
                            variant="destructive"
                            className="text-[10px] font-bold px-2 py-0.5 shrink-0 ml-2"
                          >
                            未返信
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="py-5 space-y-5">
                      {/* 口コミ本文 */}
                      <p className="text-sm leading-relaxed text-foreground/90" style={{ overflowWrap: "break-word", whiteSpace: "pre-wrap" }}>
                        {getReviewText(review)}
                      </p>

                      {/* ── 未返信タブ: AI生成返信の編集エリア ── */}
                      {activeTab === "pending" && replies[review.id] && (
                        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                              <Sparkles className="size-3.5" />
                              <span>AI 生成の返信案</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => copyToClipboard(replies[review.id])}
                            >
                              <Copy className="size-3 mr-1.5" />
                              コピー
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <textarea
                              value={replies[review.id]}
                              onChange={(e) => setReplies(prev => ({ ...prev, [review.id]: e.target.value }))}
                              className="w-full min-h-[120px] p-3 text-sm leading-relaxed font-medium text-foreground bg-background border border-primary/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                              style={{ overflowWrap: "break-word" }}
                              placeholder="返信内容を編集できます..."
                            />
                            <div className={`text-xs text-right font-medium ${replies[review.id].length > 300
                              ? "text-destructive font-bold"
                              : replies[review.id].length > 280
                                ? "text-amber-600"
                                : "text-muted-foreground"
                              }`}>
                              {replies[review.id].length} / 300文字
                              {replies[review.id].length > 300 && " (超過)"}
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg h-9"
                              onClick={() => setReplies(prev => {
                                const next = { ...prev };
                                delete next[review.id];
                                return next;
                              })}
                            >
                              破棄
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-lg h-9 px-4"
                              onClick={() => handleSubmitReply(review.id)}
                              disabled={submittingFor === review.id || replies[review.id].length > 300}
                            >
                              {submittingFor === review.id ? (
                                <Loader2 className="size-4 animate-spin mr-2" />
                              ) : (
                                <CheckCircle className="size-4 mr-2" />
                              )}
                              {submittingFor === review.id ? "保存中..." : "この内容で返信"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ── 返信済みタブ: 保存済み返信の表示 + コピー + 未返信に戻す ── */}
                      {activeTab === "replied" && review.reply_content && (
                        <div className="p-5 rounded-2xl bg-muted/50 border space-y-3">
                          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>保存済みの返信</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => copyToClipboard(review.reply_content!)}
                            >
                              <Copy className="size-3 mr-1.5" />
                              コピー
                            </Button>
                          </div>
                          <p className="text-sm text-foreground/70 italic" style={{ overflowWrap: "break-word", whiteSpace: "pre-wrap" }}>
                            {review.reply_content}
                          </p>
                          <div className="flex justify-end pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-destructive h-8"
                              onClick={() => handleResetStatus(review.id)}
                              disabled={resettingFor === review.id}
                            >
                              <RotateCcw className={`size-3.5 mr-1.5 ${resettingFor === review.id ? "animate-spin" : ""}`} />
                              未返信に戻す
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>

                    {/* ── 未返信タブ: AI生成ボタン (Component) ── */}
                    {activeTab === "pending" && !replies[review.id] && (
                      <div className="px-6 py-4 bg-muted/10 border-t flex justify-end">
                        <ReviewReplyButton
                          reviewText={getReviewText(review)}
                          customerName={review.author}
                          rating={review.rating}
                          onReplyGenerated={(reply) => setReplies(prev => ({ ...prev, [review.id]: reply }))}
                          className="rounded-lg"
                        />
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
