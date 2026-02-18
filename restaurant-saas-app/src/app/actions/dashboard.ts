"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { DashboardStats, FirestoreReview, Announcement } from "@/types/firestore";
import { FieldValue } from "firebase-admin/firestore";
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
    const cookieStore = await cookies();

    try {
        // Demoモード判定: 明示的に demo-user-id である場合のみに制限
        const isDemo = uid === "demo-user-id";

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
                    text: {
                        sent: aiUsageCount,
                        limit: 2000,
                        remaining: Math.max(0, 2000 - aiUsageCount)
                    },
                    image: {
                        sent: 12,
                        limit: 60,
                        remaining: 48
                    }
                },
                planName: "Standard",
                storeName: "デモ店舗 (Demo Store)",
                nextPaymentDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
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

        // プラン名の正規化
        // 1.5 管理者によるプラン偽装 (Simulated Plan) のチェック
        const adminId = process.env.NEXT_PUBLIC_ADMIN_USER_ID;
        const isAdmin = uid === adminId || uid === "demo-user-id";
        let planName = userData?.plan || "web Light";

        if (isAdmin) {
            const simulatedPlanCookie = cookieStore.get("simulated_plan")?.value;
            if (simulatedPlanCookie) {
                planName = simulatedPlanCookie;
            }
        }

        // プラン名の正規化
        const normalized = planName.toLowerCase();
        if (normalized.includes('premium')) planName = 'web Pro Premium';
        else if (normalized.includes('pro') || normalized === 'business') planName = 'web Pro';
        else if (normalized.includes('standard')) planName = 'web Standard';
        else planName = 'web Light';

        // 2. AIクォータ情報の取得
        const [textQuota, imageQuota] = await Promise.all([
            checkAiQuota(uid, planName, 'text'),
            checkAiQuota(uid, planName, 'image')
        ]);

        // 3. 店舗情報の取得
        const storeRef = adminDb.collection("stores").doc(uid);
        const storeSnap = await storeRef.get();
        const storeData = storeSnap.data();

        return {
            totalReviews: Math.max(0, statsData?.totalReviews || 0),
            unrepliedCount: Math.max(0, statsData?.unrepliedCount || 0),
            repliedCount: Math.max(0, statsData?.repliedCount || 0),
            averageRating: statsData?.averageRating || 0,
            lowRatingCount: Math.max(0, statsData?.lowRatingCount || 0),
            aiUsage: {
                text: {
                    sent: textQuota.usage.sent,
                    limit: textQuota.usage.limit,
                    remaining: textQuota.usage.remaining
                },
                image: {
                    sent: imageQuota.usage.sent,
                    limit: imageQuota.usage.limit,
                    remaining: imageQuota.usage.remaining
                }
            },
            planName: planName,
            storeName: storeData?.storeName || "",
            nextPaymentDate: userData?.nextPaymentDate?.toDate() || null,
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
            aiUsage: {
                text: { sent: 0, limit: 2000, remaining: 2000 },
                image: { sent: 0, limit: 0, remaining: 0 }
            },
            planName: "Light Plan",
            storeName: "Loading Error...",
            nextPaymentDate: null,
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
            const cookieStore = await cookies();
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
    const isDemo = uid === "demo-user-id";

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
        // getDashboardStats 側の初期値 (45 + 既に返信した件数) と整合性を取る
        const currentAiUsage = aiUsageCookie ? parseInt(aiUsageCookie, 10) : 45 + (repliedSet.size - 1);
        cookieStore.set("ai_usage_count", (currentAiUsage + 1).toString(), {
            path: '/',
            maxAge: 60 * 60 * 24
        });
    } else {
        const reviewRef = adminDb.collection("reviews").doc(reviewId);
        const statsRef = adminDb.collection("users").doc(uid).collection("stats").doc("current");

        await adminDb.runTransaction(async (t) => {
            const [reviewSnap, statsSnap] = await Promise.all([
                t.get(reviewRef),
                t.get(statsRef)
            ]);

            if (!reviewSnap.exists) throw new Error("レビューが見つかりませんでした");
            const reviewData = reviewSnap.data();
            if (reviewData?.userId !== uid) throw new Error("権限がありません");
            if (reviewData?.status === "replied") return; // 既に返信済み

            // 1. レビューの更新
            t.update(reviewRef, {
                status: "replied",
                replySummary: replyText,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 2. 統計の更新
            if (statsSnap.exists) {
                t.update(statsRef, {
                    unrepliedCount: FieldValue.increment(-1),
                    repliedCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else {
                // 存在しない場合は作成 (安全策)
                // 既存のレビュー数をカウントするのが理想だが、ここでは最小構成で初期化
                t.set(statsRef, {
                    totalReviews: 1,
                    unrepliedCount: 0,
                    repliedCount: 1,
                    averageRating: 5.0,
                    lowRatingCount: 0,
                    updatedAt: FieldValue.serverTimestamp()
                });
            }

            // 3. AI利用枠のインクリメント
            const now = new Date();
            const usageMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const usageRef = adminDb.collection("stores").doc(uid).collection("monthly_usage").doc(usageMonth);

            t.set(usageRef, {
                aiTextCostYen: FieldValue.increment(0.35),
                aiTextCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true });
        });
    }

    // パス再検証
    revalidatePath('/dashboard');

    return { success: true };
}
