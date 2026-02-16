"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { DashboardStats, FirestoreReview } from "@/types/firestore";
import { headers } from "next/headers";

/**
 * 認証チェックを行う内部ヘルパー
 * Server Actions はクライアントから直接呼ばれるため、毎回トークン検証が必要。
 * ただし、"use server" 内では headers() から Authorization ヘッダーを取るのが一般的だが、
 * Next.js の Server Actions では Cookie セッションを使うか、
 * クライアントからトークンを引数で渡す必要がある。
 * 
 * 今回は SOP に従い「クライアントで getToken() して API を叩く」構成（Route Handlers）と、
 * 「Server Actions で完結させる」構成のハイブリッドになるが、
 * Phase 2 では Server Actions 内で `verifyIdToken` を行うために
 * クライアントから `idToken` を受け取る形にするのが確実。
 */
async function verifyUser(idToken?: string) {
    if (!idToken) {
        throw new Error("Unauthorized: No token provided");
    }
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded.uid;
    } catch (error) {
        console.error("Auth Error:", error);
        throw new Error("Unauthorized: Invalid token");
    }
}

/**
 * ダッシュボードの統計情報を取得する
 * @param idToken Firebase ID Token
 */
export async function getDashboardStats(idToken: string): Promise<DashboardStats> {
    const uid = await verifyUser(idToken);

    // 本来は tenants/{uid}/stats/current だが、Phase 2 初期は簡単なパスで実装
    // Collection: `users/{uid}/stats` Doc: `current`
    const docRef = adminDb.collection("users").doc(uid).collection("stats").doc("current");
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
        // データがない場合のデフォルト値
        return {
            totalReviews: 0,
            unrepliedCount: 0,
            repliedCount: 0,
            averageRating: 0,
            lowRatingCount: 0,
            updatedAt: new Date(),
        };
    }

    const data = snapshot.data();
    return {
        totalReviews: data?.totalReviews || 0,
        unrepliedCount: data?.unrepliedCount || 0,
        repliedCount: data?.repliedCount || 0,
        averageRating: data?.averageRating || 0,
        lowRatingCount: data?.lowRatingCount || 0,
        updatedAt: data?.updatedAt?.toDate() || new Date(),
    };
}

/**
 * レビュー一覧を取得する
 * @param idToken Firebase ID Token
 * @param filter "all" | "pending" | "replied"
 * @param limitCount 取得件数 (default 20)
 * @param startAfterCursor ページング用カーソル (ISO string or ID)
 */
export async function getReviews(
    idToken: string,
    filter: "all" | "pending" | "replied" = "all",
    limitCount: number = 20,
    startAfterCursor?: string
): Promise<{ reviews: FirestoreReview[]; lastDocId?: string }> {

    const uid = await verifyUser(idToken);

    let query = adminDb.collection("reviews").where("userId", "==", uid);

    // フィルタ適用
    if (filter === "pending") {
        query = query.where("status", "==", "unreplied");
    } else if (filter === "replied") {
        query = query.where("status", "==", "replied");
    }

    // ソート順: 作成日時の降順
    query = query.orderBy("publishedAt", "desc");

    // カーソル（簡易実装: publishedAt がユニークでない場合に備えて ID タイブレークが必要だが、
    // 今回は一旦 publishedAt 文字列をカーソルとして受け取る形を想定。
    // 本格的には DocumentSnapshot を回したいが Server Actions ではシリアライズ不可なため
    // 文字列（IDなど）をキーにする工夫が必要）

    if (startAfterCursor) {
        // 注: 本来は DocumentSnapshot を使いたいが、ここでは単純化のため割愛
        // 実運用では `startAfter(timestamp)` 等の実装が必要
    }

    query = query.limit(limitCount);

    const snapshot = await query.get();

    const reviews: FirestoreReview[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            storeId: data.storeId || "",
            userId: data.userId || "",
            author: data.author || "Unknown",
            rating: data.rating || 0,
            content: data.content || "",
            source: data.source || "google",
            status: data.status || "unreplied",
            replySummary: data.replySummary,
            publishedAt: data.publishedAt?.toDate() || new Date(),
            fetchedAt: data.fetchedAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    });

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];

    return {
        reviews,
        lastDocId: lastDoc?.id, // ページング用
    };
}
