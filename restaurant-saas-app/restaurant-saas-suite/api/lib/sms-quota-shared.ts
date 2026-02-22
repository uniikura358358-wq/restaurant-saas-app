/**
 * SMS送信クォータ共有モジュール
 * クライアント・サーバー両方で使用可能な型定義と定数。
 */

// --- 型定義 ---

/** usage/{YYYY-MM} ドキュメントの型 */
export interface StoreUsageDoc {
    smsSentCount: number;
    usageMonth: string;
    updatedAt: any;
}

/** SMS利用状況サマリー（UI表示用） */
export interface SmsUsageSummary {
    /** 今月の送信済み件数 */
    sent: number;
    /** 月間上限件数 */
    limit: number;
    /** 残り送信可能件数 */
    remaining: number;
    /** 対象年月 (例: '2026-02') */
    usageMonth: string;
}

/** クォータチェック結果 */
export interface QuotaCheckResult {
    /** 送信可能なら true */
    allowed: boolean;
    /** 現在の利用状況 */
    usage: SmsUsageSummary;
    /** 送信不可の場合の理由 */
    reason?: string;
}

// --- 定数 ---

export const DEFAULT_SMS_LIMIT = 10;
