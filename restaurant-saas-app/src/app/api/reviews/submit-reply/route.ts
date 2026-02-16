import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-utils";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { reviewId, replyContent } = await request.json();
        const requestId = request.headers.get("X-Request-ID");

        // 1. Authentication (Firebase)
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Validation
        if (!reviewId || !replyContent) {
            return NextResponse.json(
                { error: "レビューIDと返信内容は必須です" },
                { status: 400 }
            );
        }

        if (!requestId) {
            return NextResponse.json(
                { error: "X-Request-ID ヘッダーが必要です" },
                { status: 400 }
            );
        }

        const MAX_LENGTH = 300;
        if (replyContent.length > MAX_LENGTH) {
            return NextResponse.json(
                { error: `返信内容が長すぎます（${MAX_LENGTH}文字以内にしてください）` },
                { status: 400 }
            );
        }

        // 3. Idempotency Check (冪等性)
        const requestRef = adminDb.collection("requests").doc(requestId);
        const requestDoc = await requestRef.get();

        if (requestDoc.exists) {
            const data = requestDoc.data();
            if (data?.status === "success") {
                // 既に成功している場合はキャッシュされた結果を返す
                return NextResponse.json(data.response);
            } else if (data?.status === "processing") {
                return NextResponse.json(
                    { error: "リクエストは現在処理中です" },
                    { status: 409 }
                );
            }
        }

        // 4. Firestore Transaction
        // reviews/{reviewId} の更新 + replies/{reviewId} 作成 + users/{uid}/stats/current 更新 + requests/{requestId} 作成
        // これらをアトミックに行う
        let resultData: any;

        try {
            await adminDb.runTransaction(async (t) => {
                // Read operations must come first
                const reviewRef = adminDb.collection("reviews").doc(reviewId);
                const reviewDoc = await t.get(reviewRef);

                if (!reviewDoc.exists) {
                    throw new Error("指定されたレビューが見つかりません");
                }

                const reviewData = reviewDoc.data();
                if (reviewData?.userId !== user.uid) {
                    throw new Error("このレビューを更新する権限がありません");
                }

                if (reviewData?.status === "replied") {
                    throw new Error("既に返信済みです");
                }

                const statsRef = adminDb.collection("users").doc(user.uid).collection("stats").doc("current");
                const statsDoc = await t.get(statsRef);

                // Write operations
                // A. Mark Request as Processing (Optimistic: in a real distributed system we might do this outside, but here inside 't' safeguards consistency)
                // Note: Firestore Tx requires all Reads before Writes. We did Reads.

                // B. Update Review
                t.update(reviewRef, {
                    status: "replied",
                    replySummary: replyContent,
                    updatedAt: FieldValue.serverTimestamp(),
                    replyId: reviewId, // 1:1 relation
                });

                // C. Create Reply
                const replyRef = adminDb.collection("replies").doc(reviewId);
                t.set(replyRef, {
                    id: reviewId,
                    userId: user.uid,
                    reviewId: reviewId,
                    content: replyContent,
                    generatedBy: "manual", // or ai, passed from client? for now assume manual edit of AI output
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });

                // D. Update Stats
                if (statsDoc.exists) {
                    t.update(statsRef, {
                        unrepliedCount: FieldValue.increment(-1),
                        repliedCount: FieldValue.increment(1),
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                } else {
                    // Create if not exists (defensive)
                    t.set(statsRef, {
                        totalReviews: 1, // assumption
                        unrepliedCount: 0,
                        repliedCount: 1,
                        averageRating: 0,
                        lowRatingCount: 0,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                }

                // E. Save Request Result (Idempotency)
                resultData = {
                    success: true,
                    reviewId,
                    status: "replied",
                    timestamp: new Date().toISOString()
                };

                t.set(requestRef, {
                    userId: user.uid,
                    status: "success",
                    response: resultData,
                    createdAt: FieldValue.serverTimestamp(),
                });
            });
        } catch (txError: any) {
            // トランザクション失敗時はエラーを投げる（requestRefは作成されないのでリトライ可能）
            // 明示的なドメインエラーの場合は 400/403/404 等を返すべきだが、
            // ここでは簡易的に 500 or Error Message とする
            throw txError;
        }

        // 5. Google Business Profile に返信 (Best Effort: Transactionの外で行う)
        // トランザクション成功後に実行。失敗してもDBはロールバックしない（整合性優先）
        // ※ 本来は Cloud Functions トリガーで非同期に行うのがベストだが、Phase 3 では同期的実行を維持
        // 必要であれば google_review_id を取得しておく必要がある
        const reviewDocAfter = await adminDb.collection("reviews").doc(reviewId).get();
        const googleReviewId = reviewDocAfter.data()?.id; // Assuming id IS google_review_id or stored elsewhere

        // 注: FirestoreReview schema では id が Google Review ID かどうか明記されていないが、
        // 移行元(Supabase)のカラム `google_review_id` に相当するものが `id` に入っていると仮定するか、
        // `sourceId` などのフィールドが必要。
        // 現状の schema 定義では `id` を使用。

        if (googleReviewId && reviewDocAfter.data()?.source === 'google') {
            try {
                // Dynamic import to avoid loading logic if not needed
                // Note: Ensure strictly server-side
                const { replyToReview } = await import("@/lib/google-business-profile");
                await replyToReview(googleReviewId, replyContent);
            } catch (googleError) {
                console.error("Failed to post reply to Google:", googleError);
                // ユーザーには成功として返す（DBは更新済みのため）
            }
        }

        return NextResponse.json(resultData);

    } catch (error: any) {
        console.error("Error in submit-reply:", error);

        const errorMessage = error.message || "返信の保存中にエラーが発生しました";
        let status = 500;

        if (errorMessage.includes("権限")) status = 403;
        if (errorMessage.includes("見つかりません")) status = 404;
        if (errorMessage.includes("返信済み")) status = 409;
        if (errorMessage.includes("X-Request-ID")) status = 400;

        return NextResponse.json(
            { error: errorMessage },
            { status }
        );
    }
}
