"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { DashboardStats, FirestoreReview } from "@/types/firestore";
import { headers, cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// HMR Force Refresh: 2026-02-17

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

    // 開発環境用のデモトークン対応
    if (process.env.NODE_ENV === "development" && idToken === "demo-token") {
        return "demo-user-id";
    }

    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded.uid;
    } catch (error) {
        console.error("Auth Error:", error);
        throw new Error("Unauthorized: Invalid token");
    }
}

import { checkAiQuota } from "@/lib/ai-quota";

const MOCK_TOTAL_REVIEWS = 15;
const MOCK_INIT_REPLIED = 5;

/**
 * ダッシュボードの統計情報を取得する
 * @param idToken Firebase ID Token
 */
export async function getDashboardStats(idToken: string): Promise<DashboardStats> {
    const uid = await verifyUser(idToken);
    const cookieStore = await headers();

    try {
        // Demoモード判定
        const isDemo = uid === "demo-user-id" || cookieStore.get('is_demo_mode')?.value === 'true';

        if (isDemo) {
            // Cookieから返信済みIDリストを取得
            const repliedCookie = cookieStore.get('replied_reviews')?.value || cookieStore.get('demo_replied_ids')?.value || '';
            let repliedIds: string[] = [];

            if (repliedCookie) {
                if (repliedCookie.startsWith('[')) {
                    try { repliedIds = JSON.parse(repliedCookie); } catch (e) { }
                } else {
                    repliedIds = repliedCookie.split(',').filter(Boolean);
                }
            }

            const repliedCountInSession = repliedIds.length;

            // 統計の再計算
            const totalReplied = MOCK_INIT_REPLIED + repliedCountInSession;
            const totalUnreplied = Math.max(0, MOCK_TOTAL_REVIEWS - totalReplied);

            // AI利用回数
            const aiUsageCookie = cookieStore.get('ai_usage_count')?.value;
            const aiUsageCount = aiUsageCookie ? parseInt(aiUsageCookie, 10) : 45 + repliedCountInSession;

            return {
                totalReviews: MOCK_TOTAL_REVIEWS + 109, // 既存の124に合わせる形か、MOCK準拠か。ここではユーザー案に近い形に。
                unrepliedCount: totalUnreplied,
                repliedCount: totalReplied + 111, // 既存の116に合わせる
                averageRating: 4.8,
                lowRatingCount: 2,
                aiUsage: {
                    sent: aiUsageCount,
                    limit: 100,
                    remaining: Math.max(0, 100 - aiUsageCount)
                },
                planName: "Standard",
                storeName: "デモ店舗 (Demo Store)",
                updatedAt: new Date(),
            };
        }

        // 1. 基本統計 (Reviews) の取得
        const statsRef = adminDb.collection("users").doc(uid).collection("stats").doc("current");
        const userRef = adminDb.collection("users").doc(uid);

        const [statsSnap, userSnap] = await Promise.all([
            statsRef.get(),
            userRef.get()
        ]);

        const statsData = statsSnap.data();
        const userData = userSnap.data();
        const planName = userData?.plan || "Light Plan";

        // 2. AIクォータ情報の取得
        const aiQuota = await checkAiQuota(uid, planName);

        // 3. 店舗情報の取得
        const storeRef = adminDb.collection("stores").doc(uid);
        const storeSnap = await storeRef.get();
        const storeData = storeSnap.data();

        return {
            totalReviews: statsData?.totalReviews || 0,
            unrepliedCount: statsData?.unrepliedCount || 0,
            repliedCount: statsData?.repliedCount || 0,
            averageRating: statsData?.averageRating || 0,
            lowRatingCount: statsData?.lowRatingCount || 0,
            aiUsage: {
                sent: aiQuota.usage.sent,
                limit: aiQuota.usage.limit,
                remaining: aiQuota.usage.remaining
            },
            planName: planName,
            storeName: storeData?.storeName || "",
            updatedAt: statsData?.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error("Firestore Error in getDashboardStats:", error);
        // エラー時（オフライン等）のフォールバック
        return {
            totalReviews: 0,
            unrepliedCount: 0,
            repliedCount: 0,
            averageRating: 0,
            lowRatingCount: 0,
            aiUsage: { sent: 0, limit: 10, remaining: 10 },
            planName: "Light Plan",
            storeName: "Loading Error...",
            updatedAt: new Date(),
        };
    }
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

    try {
        if (uid === "demo-user-id") {
            const cookieStore = await headers();
            const repliedCookie = cookieStore.get('replied_reviews')?.value || cookieStore.get('demo_replied_ids')?.value || '';
            const repliedIds = new Set<string>();

            if (repliedCookie) {
                if (repliedCookie.startsWith('[')) {
                    try {
                        const parsed = JSON.parse(repliedCookie);
                        if (Array.isArray(parsed)) parsed.forEach(id => repliedIds.add(id));
                    } catch (e) { }
                } else {
                    repliedCookie.split(',').forEach(id => {
                        if (id) repliedIds.add(id);
                    });
                }
            }

            // モックレビューデータの生成（ID: demo-review-1~15）
            const demoReviews: FirestoreReview[] = Array.from({ length: MOCK_TOTAL_REVIEWS }, (_, i) => {
                const id = `demo-review-${i + 1}`;
                // 旧形式の ID (demo-1, demo-2) との互換性のためのエイリアス
                const legacyId = `demo-${i + 1}`;

                // 初期状態で返信済みとするID（例: 1~5）
                const isInitiallyReplied = i < MOCK_INIT_REPLIED;

                // 現在の状態判定: 初期返信済み OR ユーザーが返信済み
                const isReplied = isInitiallyReplied || repliedIds.has(id) || repliedIds.has(legacyId);

                return {
                    id,
                    storeId: "demo-store",
                    userId: "demo-user-id",
                    author: `Demo User ${i + 1}`,
                    rating: i % 2 === 0 ? 5 : 4,
                    content: `これはデモ用のレビューコメントです。${i + 1}`,
                    source: "google",
                    status: isReplied ? "replied" : "unreplied",
                    replySummary: isReplied ? "ご来店ありがとうございます。（デモ返信）" : undefined,
                    publishedAt: new Date(Date.now() - i * 3600000),
                    fetchedAt: new Date(),
                    updatedAt: new Date(),
                };
            });

            // フィルタ適用
            const filteredReviews = demoReviews.filter(r => {
                if (filter === "pending") return r.status === "unreplied";
                if (filter === "replied") return r.status === "replied";
                return true;
            });

            return { reviews: filteredReviews };
        }

        let query = adminDb.collection("reviews").where("userId", "==", uid);

        // フィルタ適用
        if (filter === "pending") {
            query = query.where("status", "==", "unreplied");
        } else if (filter === "replied") {
            query = query.where("status", "==", "replied");
        }

        // ソート順: 作成日時の降順
        query = query.orderBy("publishedAt", "desc");

        if (startAfterCursor) {
            // パラメータに基づいたページングの実装（ここでは割愛）
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
            lastDocId: lastDoc?.id,
        };
    } catch (error) {
        return { reviews: [] };
    }
}

/**
 * レビューへの返信を送信・保存する
 * @param idToken Firebase ID Token
 * @param reviewId レビューID
 * @param replyText 返信内容
 */
export async function submitReply(idToken: string, reviewId: string, replyText: string) {
    const uid = await verifyUser(idToken);
    const cookieStore = await cookies();

    // デモモード判定
    const isDemo = uid === "demo-user-id" || cookieStore.get('is_demo_mode')?.value === 'true';

    if (isDemo) {
        // --- デモモード用: CookieにIDを追記 ---
        const currentReplied = cookieStore.get('replied_reviews')?.value || cookieStore.get('demo_replied_ids')?.value || '';
        const repliedSet = new Set(currentReplied ? (currentReplied.startsWith('[') ? JSON.parse(currentReplied) : currentReplied.split(',').filter(Boolean)) : []);

        repliedSet.add(reviewId);

        cookieStore.set('replied_reviews', Array.from(repliedSet).join(','), {
            path: '/',
            maxAge: 60 * 60 * 24 // 1日
        });

        // AI利用回数のインクリメント
        const aiUsageCookie = cookieStore.get("ai_usage_count")?.value;
        const currentAiUsage = aiUsageCookie ? parseInt(aiUsageCookie, 10) : 45;
        cookieStore.set("ai_usage_count", (currentAiUsage + 1).toString(), {
            path: '/',
            maxAge: 60 * 60 * 24
        });
    } else {
        // --- 本番用: Route Handler またはここにロジックを実装 ---
        // 現状は既存の API Route (/api/reviews/submit-reply) を活用するため、
        // 必要に応じてここから internal fetch するかロジックを共通化
        // 暫定的にデモモード以外はエラーを投げるか、APIの実装を反映
        throw new Error("Production logic for submitReply in Server Action is not yet fully implemented. Please use API Route for now.");
    }

    // パス再検証
    revalidatePath('/dashboard');

    return { success: true };
}
