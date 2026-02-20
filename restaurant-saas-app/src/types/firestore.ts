import type { Timestamp } from "firebase-admin/firestore";

// ---------------------------------------------------------
// Firestore Schema Definitions (To-Be)
// ---------------------------------------------------------

/**
 * users/{uid}/stats/current
 * ダッシュボード表示用の集計データ。
 * 読み取りコスト削減のため、全件集計せずにこのドキュメントを参照する。
 */
export interface DashboardStats {
    totalReviews: number;
    unrepliedCount: number;
    repliedCount: number;
    averageRating: number;
    lowRatingCount: number; // 星1-2の数
    aiUsage?: {
        text: {
            sent: number;
            limit: number;
            remaining: number;
        };
        image: {
            sent: number;
            limit: number;
            remaining: number;
        };
    };
    planName?: string;
    storeName?: string;
    nextPaymentDate?: Timestamp | Date | null; // 次回支払日
    updatedAt: Timestamp | Date;
}

/**
 * announcements/{id}
 * 運営からのお知らせデータ。
 */
export interface Announcement {
    id: string;
    title: string;
    content: string;
    isRead?: boolean;
    createdAt: Timestamp | Date;
}

/**
 * reviews/{reviewId}
 * Google Business Profile から取得した口コミデータ。
 */
export interface FirestoreReview {
    id: string; // Google Review ID or UUID
    storeId: string;
    userId: string; // Firebase UID

    author: string;
    rating: number; // 1-5
    content: string; // 口コミ本文
    source: "google" | "manual";

    status: "unreplied" | "replied";
    replyId?: string; // 1:1 relation to replies collection
    replySummary?: string; // 一覧表示用の返信内容（50文字程度）

    publishedAt: Timestamp | Date; // 口コミ投稿日時
    fetchedAt: Timestamp | Date;   // システム取込日時
    updatedAt: Timestamp | Date;
}

/**
 * replies/{reviewId}
 * 口コミに対する返信データ。
 * Reviewとは分離して管理し、必要な時だけ取得する（一覧ではreplySummaryを使用）。
 */
export interface FirestoreReply {
    id: string; // reviewId と同一
    userId: string;
    reviewId: string;

    content: string; // 返信本文
    generatedBy: "ai" | "manual";

    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}

/**
 * users/{uid} (profiles)
 * ユーザーの基本情報と契約状態。
 */
export interface UserProfile {
    email: string;
    storeId?: string;
    plan: "free" | "standard" | "premium";
    subscriptionStatus: "active" | "canceled" | "past_due" | "incomplete";
    stripeCustomerId?: string;

    aiUsageCount: number; // 今月の生成回数
    aiUsageLimit: number; // プラン上限

    lastLoginAt: Timestamp | Date;
}

/**
 * stores/{uid}
 * 店舗ごとの設定データ。
 * MVPでは storeId = ownerUid とする。
 */
export interface WebsiteMaterials {
    catchCopy: string;
    storeName?: string;
    address?: string;
    phone?: string;
    businessHours?: string;
    // Images are stored as URLs (or empty strings for now)
    images: {
        interior?: string;
        menu1?: string;
        menu2?: string;
        menu3?: string;
        [key: string]: string | undefined;
    };
    // Menu items
    menus?: any[];
}

// Notification Config Type (migrated from notification-handler.ts)
export interface NotificationConfig {
    email_enabled: boolean;
    sms_enabled: boolean;
    email_address: string;
    phone_number: string;
    email_verified: boolean;
    phone_verified: boolean;
    target_stars: number[];
    silent_hours: {
        start: string;
        end: string;
    };
    last_notified_at: string | null;
}

export interface StoreData {
    ownerUid: string;
    storeName: string;
    websiteMaterials: WebsiteMaterials;

    // Settings
    notificationConfig?: NotificationConfig;
    smsLimitOverride?: number;
    aiTone?: "polite" | "friendly" | "energetic";

    // Google Business Profile 連携用
    gbpAccountId?: string;  // accounts/ACCOUNT_ID
    gbpLocationId?: string; // locations/LOCATION_ID

    updatedAt: Timestamp | Date;
}

/**
 * stores/{uid}/accounting_entries/{entryId}
 * 会計・領収書の解析データ
 */
export interface AccountingEntry {
    id: string;
    userId: string;
    merchantName: string;
    totalAmount: number;
    transactionDate: string;
    category: string;
    invoiceNumber?: string;
    taxAmount?: number;
    imageUrl?: string; // 保存された画像のURL
    status: "pending" | "confirmed";
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}
