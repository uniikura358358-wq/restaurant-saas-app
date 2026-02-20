"use server";

import { adminDb, adminAuth, adminDbSecondary, getDbForUser } from "@/lib/firebase-admin";
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
async function verifyUser(idToken?: string): Promise<string> {
    if (!idToken) {
        throw new Error("Unauthorized: No token provided");
    }

    const { verifyAuth } = await import("@/lib/auth-utils");
    const user = await verifyAuth(idToken);

    if (!user) {
        throw new Error("Unauthorized: Invalid token");
    }

    return user.uid;
}

import { checkAiQuota } from "@/lib/ai-quota";

const MOCK_TOTAL_REVIEWS = 30;
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

            // 統計の計算 (IDベースで正確に計算)
            const allUnrepliedReviewIds = Array.from({ length: MOCK_TOTAL_REVIEWS - MOCK_INIT_REPLIED }, (_, i) => {
                const num = i + MOCK_INIT_REPLIED + 1;
                return { id: `demo-review-${num}`, legacyId: `demo-${num}` };
            });

            const unrepliedCount = allUnrepliedReviewIds.filter(item =>
                !repliedIds.includes(item.id) && !repliedIds.includes(item.legacyId)
            ).length;

            const totalReplied = MOCK_TOTAL_REVIEWS - unrepliedCount;

            // AI利用回数
            const aiUsageCookie = cookieStore.get('ai_usage_count')?.value;
            const aiUsageCount = aiUsageCookie ? parseInt(aiUsageCookie, 10) : 45 + (MOCK_TOTAL_REVIEWS - MOCK_INIT_REPLIED - unrepliedCount);

            return {
                totalReviews: MOCK_TOTAL_REVIEWS + 109,
                unrepliedCount: unrepliedCount,
                repliedCount: totalReplied + 111,
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
        const db = await getDbForUser(uid);
        let statsSnap, userSnap;

        try {
            const statsRef = db.collection("users").doc(uid).collection("stats").doc("current");
            const userRef = db.collection("users").doc(uid);
            [statsSnap, userSnap] = await Promise.all([statsRef.get(), userRef.get()]);
        } catch (dbError: any) {
            console.error("Dashboard stats fetch error:", dbError);
            throw new Error("データの取得に失敗しました。");
        }

        const statsData = statsSnap.data();
        const userData = userSnap.data();

        // 2. AIクォータ情報の取得 (activeDb を使用)
        // checkAiQuota 内部でも adminDb を使っている可能性があるため注意が必要だが、
        // 今回はシンプルに stats/user データが取れた方の DB を基準にするロジックを優先
        const [textQuota, imageQuota] = await Promise.all([
            checkAiQuota(uid, userData?.plan || "web Light", 'text'),
            checkAiQuota(uid, userData?.plan || "web Light", 'image')
        ]);

        // 3. 店舗情報の取得 (取得に成功した DB を使用)
        const storeRef = db.collection("stores").doc(uid);
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
            planName: userData?.plan || "web Light",
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

            // リアルな口コミデータの定義
            const REAL_REVIEWS_DATA = [
                { author: "佐藤 健一", rating: 5, content: "隠れ家的な雰囲気で最高でした。特に白レバーのパテが絶品！ワインのセレクトもセンスが良く、デートにもおすすめです。また必ず来ます。" },
                { author: "田中 みゆき", rating: 4, content: "ランチで利用しました。1000円前後でこのボリュームと味はコスパ良すぎます。ただ、お昼時はかなり混むので早めに行くのが吉。" },
                { author: "Google ユーザー", rating: 2, content: "味は美味しいのに、店員の態度が残念でした。注文をお願いしてもなかなか来ず、お会計の際も一言もなし。改善を期待します。" },
                { author: "高橋 浩二", rating: 5, content: "家族の誕生日に利用。デザートプレートのサプライズ、本当にありがとうございました！スタッフの皆さんが温かくて、一生の思い出になりました。" },
                { author: "伊藤 絵里", rating: 4, content: "パスタがモチモチで美味しかったです。女性一人でも入りやすい雰囲気なのが嬉しい。季節限定メニューも豊富で飽きなそうです。" },
                { author: "渡辺 誠", rating: 1, content: "予約したのに席が空いていないと言われ、外で15分待たされました。謝罪も軽く、不快な気持ちになりました。二度と行きません。" },
                { author: "小林 直美", rating: 5, content: "ここのハンバーグは肉汁がすごいです！ナイフを入れた瞬間に溢れ出します。トッピングのチーズも濃厚で、ライスが進みます。" },
                { author: "中村 俊介", rating: 3, content: "料理は普通に美味しいですが、少し単価が高いかな。ドリンクメニューがもう少し充実していると嬉しいです。" },
                { author: "加藤 結衣", rating: 4, content: "インスタ映えする外観に惹かれて入りましたが、味も本格的でした！ラテアートがとにかく可愛くて飲むのがもったいなかった。" },
                { author: "山口 隆", rating: 5, content: "接待で使用。静かな個室を用意していただき、先方も大変満足していました。料理の説明も丁寧で安心して任せられました。" },
                { author: "斎藤 まなみ", rating: 4, content: "野菜が新鮮で甘いです。バーニャカウダのソースが絶品。ヘルシーに美味しいものを食べたい時はここ一択ですね。" },
                { author: "松本 哲也", rating: 2, content: "スープがぬるかったです。以前来たときは美味しかったので期待していた分、残念でした。キッチンの方はちゃんと味見しているのでしょうか。" },
                { author: "井上 智子", rating: 5, content: "店主さんのこだわりが感じられるお店。旬の食材を一番美味しい形で提供してくれます。教えたいけど教えたくない、そんな名店です。" },
                { author: "木村 拓也", rating: 3, content: "金曜の夜だったのでガヤガヤしてました。静かに話したい時には向かないかも。お酒の提供スピードは早くて良かったです。" },
                { author: "林 芳雄", rating: 4, content: "昔ながらの洋食屋さんという感じで落ち着きます。オムライスの卵がトロトロで、デミグラスソースとの相性が抜群でした。" },
                { author: "清水 さくら", rating: 5, content: "テラス席がワンちゃんOKなのが嬉しい！スタッフさんも犬好きのようで、お水まで出してくれました。愛犬家には天国のようなお店。" },
                { author: "山崎 健太", rating: 4, content: "揚げ物がサクサクで最高。油っこくないので年配の親も喜んで食べていました。駐車場がもう少し広いと助かります。" },
                { author: "森 亮介", rating: 1, content: "テーブルがベタついていて不衛生でした。コップも汚れが残っているし、飲食店として基本ができていないと感じます。" },
                { author: "阿部 恵", rating: 5, content: "ここのキッシュを食べてからキッシュの概念が変わりました。具だくさんで本当に幸せな気持ちになれる味です。お土産用も買っちゃいました。" },
                { author: "池田 潤", rating: 4, content: "仕事終わりに一杯。おつまみセットがちょうどいい量で助かります。駅から近いのも大きなメリット。また寄らせてもらいます。" },
                { author: "橋本 奈々", rating: 3, content: "スイーツは美味しいけど、店内の音楽が少し大きすぎます。ゆっくりお喋りしたかったのですが、少し疲れました。" },
                { author: "山下 伸也", rating: 5, content: "日本酒の種類が豊富。大将の知識が凄くて、料理に合う一杯を完璧に選んでくれます。お魚も朝獲れということで非常に新鮮でした。" },
                { author: "石川 舞", rating: 4, content: "デリバリーで注文。梱包がとても丁寧で、崩れることなく届きました。家での贅沢ランチにピッタリです。" },
                { author: "前田 裕一", rating: 2, content: "メインディッシュが出てくるまで40分かかりました。混んでいるのは分かりますが、一言説明があっても良かったのでは？" },
                { author: "藤田 かおり", rating: 5, content: "パン食べ放題が最高。焼きたてを持って回ってくれるので、ついつい食べ過ぎてしまいます。発酵バターの香りがたまりません。" },
                { author: "後藤 勇気", rating: 4, content: "コスパ抜群。サラリーマンの味方です。定食の小鉢が毎日変わるので、毎日通っても飽きません。" },
                { author: "岡田 聖子", rating: 3, content: "子供連れで行きましたが、お子様メニューがもう少し安いと嬉しいです。ベビーカーの入店自体はスムーズにさせてくれました。" },
                { author: "長谷川 健", rating: 5, content: "カレーのスパイス使いが絶妙。辛いだけじゃなくて深みがあります。トッピングのパクチーも新鮮で、エスニック好きには堪りません。" },
                { author: "村上 翔", rating: 1, content: "入店しても誰も声をかけてくれず、5分ほど放置されました。目が合っているのにスルー。非常に気分が悪かったです。" },
                { author: "佐々木 希", rating: 4, content: "夜景が綺麗でした。窓際に席は予約必須ですね。特別な日のディナーには最適のロケーションだと思います。" }
            ];

            const demoReviews: FirestoreReview[] = Array.from({ length: MOCK_TOTAL_REVIEWS }, (_, i) => {
                const data = REAL_REVIEWS_DATA[i % REAL_REVIEWS_DATA.length];
                const id = `demo-review-${i + 1}`;
                const legacyId = `demo-${i + 1}`;
                const isInitiallyReplied = i < MOCK_INIT_REPLIED;
                const isReplied = isInitiallyReplied || repliedIds.has(id) || repliedIds.has(legacyId);

                return {
                    id,
                    storeId: "demo-store",
                    userId: "demo-user-id",
                    author: data.author,
                    rating: data.rating,
                    content: data.content,
                    source: "google",
                    status: isReplied ? "replied" : "unreplied",
                    replySummary: isReplied ? "ご来店ありがとうございました。またのお越しを心よりお待ちしております。" : undefined,
                    publishedAt: new Date(Date.now() - i * 3600000 * 2),
                    fetchedAt: new Date(),
                    updatedAt: new Date(),
                };
            });

            const filteredReviews = demoReviews.filter(r => {
                if (filter === "pending") return r.status === "unreplied";
                if (filter === "replied") return r.status === "replied";
                return true;
            });

            return { reviews: filteredReviews };
        }

        const db = await getDbForUser(uid);
        let query = db.collection("reviews").where("userId", "==", uid);

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
        console.error("getReviews error:", error);
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
        const db = await getDbForUser(uid);
        const reviewRef = db.collection("reviews").doc(reviewId);
        const statsRef = db.collection("users").doc(uid).collection("stats").doc("current");

        await db.runTransaction(async (t) => {
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
            const usageRef = db.collection("stores").doc(uid).collection("monthly_usage").doc(usageMonth);

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
