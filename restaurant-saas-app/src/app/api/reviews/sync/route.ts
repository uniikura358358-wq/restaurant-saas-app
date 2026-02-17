import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyAuth } from "@/lib/auth-utils";
import { listReviews, mapGoogleReviewToFirestore } from "@/lib/google-business-profile";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

/**
 * Google Business Profile から口コミを同期する API
 * POST /api/reviews/sync
 */
export async function POST(request: Request) {
    try {
        // 1. 認証チェック
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const uid = user.uid;

        // 2. 店舗設定から gbpAccountId, gbpLocationId を取得
        const storeDoc = await adminDb.collection("stores").doc(uid).get();
        if (!storeDoc.exists) {
            return NextResponse.json({ error: "店舗情報が見つかりません" }, { status: 404 });
        }

        const storeData = storeDoc.data();
        const { gbpAccountId, gbpLocationId } = storeData || {};

        if (!gbpAccountId || !gbpLocationId) {
            return NextResponse.json({
                error: "Google Business Profile の連携設定（アカウントID、ロケーションID）が未完了です。設定画面から連携を行ってください。"
            }, { status: 400 });
        }

        // 3. GBP API から口コミ一覧を取得
        const rawReviews = await listReviews(gbpAccountId, gbpLocationId);

        if (!rawReviews || rawReviews.length === 0) {
            return NextResponse.json({ message: "新しい口コミはありませんでした", count: 0 });
        }

        // 4. Firestore への保存（重複チェック込み）
        let newCount = 0;
        let unrepliedIncrement = 0;
        let repliedIncrement = 0;

        const batch = adminDb.batch();
        const reviewsCollection = adminDb.collection("reviews");

        for (const rawReview of rawReviews) {
            const firestoreReview = mapGoogleReviewToFirestore(rawReview, uid, uid); // MVP: uid = storeId
            const reviewRef = reviewsCollection.doc(firestoreReview.id);

            // 既存チェック
            const existingDoc = await reviewRef.get();
            if (!existingDoc.exists) {
                batch.set(reviewRef, {
                    ...firestoreReview,
                    publishedAt: FieldValue.serverTimestamp(), // または Date
                    fetchedAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
                newCount++;
                if (firestoreReview.status === "unreplied") unrepliedIncrement++;
                else repliedIncrement++;
            } else {
                // 既存の場合、ステータスのみ更新（Google側で返信された場合など）
                const existingData = existingDoc.data();
                if (existingData?.status !== firestoreReview.status) {
                    batch.update(reviewRef, {
                        status: firestoreReview.status,
                        updatedAt: FieldValue.serverTimestamp(),
                    });
                    // 統計更新用
                    if (firestoreReview.status === "replied") {
                        unrepliedIncrement--;
                        repliedIncrement++;
                    } else {
                        unrepliedIncrement++;
                        repliedIncrement--;
                    }
                }
            }
        }

        // 5. 統計情報 (stats/current) の更新
        if (newCount > 0 || unrepliedIncrement !== 0 || repliedIncrement !== 0) {
            const statsRef = adminDb.collection("users").doc(uid).collection("stats").doc("current");
            batch.set(statsRef, {
                totalReviews: FieldValue.increment(newCount),
                unrepliedCount: FieldValue.increment(unrepliedIncrement),
                repliedCount: FieldValue.increment(repliedIncrement),
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            message: `${newCount} 件の新しい口コミを取り込みました`,
            count: newCount
        });

    } catch (error: any) {
        console.error("GBP Sync Error:", error);
        return NextResponse.json({
            error: error.message || "口コミの同期中にエラーが発生しました"
        }, { status: 500 });
    }
}
