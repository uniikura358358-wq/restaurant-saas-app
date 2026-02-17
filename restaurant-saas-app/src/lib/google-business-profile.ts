import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// 環境変数から認証情報を取得
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // 改行コードの修正

// スコープ定義: GBPの読み書きに必要な権限
const SCOPES = [
    'https://www.googleapis.com/auth/business.manage',
];

import { FirestoreReview } from '@/types/firestore';

/**
 * Google Business Profile API クライアントを初期化する
 */
export async function getGoogleBusinessProfileClient() {
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error("Google Credentials not set. Check environment variables.");
    }

    const auth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY,
        scopes: SCOPES,
    });

    return google.mybusinessbusinessinformation({
        version: 'v1',
        auth,
    });
}

/**
 * アカウント管理用クライアント (Review操作用)
 * ※ GBP API はバージョンや機能によってエンドポイントが分かれているため注意
 * Reviews API は `mybusiness.ACCOUNT_ID.locations.LOCATION_ID.reviews` の形式
 */
export async function getGoogleReviewsClient() {
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        throw new Error("Google Credentials not set. Check environment variables.");
    }

    const auth = new JWT({
        email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: GOOGLE_PRIVATE_KEY,
        scopes: SCOPES,
    });

    // googleapis の型定義が追いついていない場合があるため、汎用的な request メソッドを使うか
    // 特定のバージョンを指定する。
    // v4 は廃止予定、v1 (Performance/BusinessInfo) または Account Management API を使う
    // しかし Reviews は `mybusiness` (v4 legacy) から移行され、現在は `mybusinessreviews` が推奨される場合がある
    // ここでは `mybusinessbusinessinformation` ではなく `googleapis` の `mybusinessreviews` を使用する

    // googleapis の型定義が追いついていない場合があるため、anyキャストで回避
    return (google as any).mybusinessreviews({
        version: 'v1',
        auth
    });
}

/**
 * Google API のレビューデータを FirestoreReview 型にマッピングする
 * @param review Google API response review object
 * @param userId Firebase UID
 * @param storeId Store ID
 */
export function mapGoogleReviewToFirestore(review: any, userId: string, storeId: string): FirestoreReview {
    // review.name: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    const reviewId = review.name.split('/').pop() || '';

    return {
        id: reviewId,
        storeId: storeId,
        userId: userId,
        author: review.reviewer?.displayName || "Google ユーザー",
        rating: {
            'ONE': 1,
            'TWO': 2,
            'THREE': 3,
            'FOUR': 4,
            'FIVE': 5
        }[review.starRating as string] || 0,
        content: review.comment || "",
        source: "google",
        status: review.reviewReply ? "replied" : "unreplied",
        replySummary: review.reviewReply?.comment?.substring(0, 100) || undefined,
        publishedAt: review.createTime ? new Date(review.createTime) : new Date(),
        fetchedAt: new Date(),
        updatedAt: new Date(),
    };
}

/**
 * 口コミを取得する (Mock / Real)
 * @param accountId 'accounts/ACCOUNT_ID'
 * @param locationId 'locations/LOCATION_ID'
 */
export async function listReviews(accountId: string, locationId: string) {
    const client = await getGoogleReviewsClient();
    if (!client) {
        throw new Error("Google Client not initialized");
    }

    // parent: accounts/{accountId}/locations/{locationId}
    const parent = `${accountId}/${locationId}`;

    // API Call
    const res = await client.accounts.locations.reviews.list({
        parent: parent,
        pageSize: 50,
    });

    // 簡易的な型キャスト (googleapis の型が複雑または不完全な場合があるため)
    return (res.data.reviews || []) as any[];
}

/**
 * 口コミに返信する
 * @param reviewName 'accounts/X/locations/Y/reviews/Z'
 * @param replyText 返信本文
 */
export async function replyToReview(reviewName: string, replyText: string) {
    const client = await getGoogleReviewsClient();
    if (!client) {
        throw new Error("Google Client not initialized");
    }

    // API Call
    const res = await client.accounts.locations.reviews.updateReply({
        name: `${reviewName}/reply`, // The name of the review reply to update.
        requestBody: {
            comment: replyText
        }
    });

    return res.data;
}
