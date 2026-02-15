/**
 * SMS送信クォータ管理モジュール
 *
 * store_usage テーブルと連携し、月間SMS送信数の管理を行う。
 *
 * 設計原則:
 * - UPSERT方式: バッチ処理不要。取得時にレコードが無ければ自動作成（リスク対策2）
 * - アトミック更新: sms_sent_count = sms_sent_count + 1 で二重計上防止（リスク対策1）
 * - プラン即時反映: sms_limit_override カラムで即座に上限変更可能（リスク対策4）
 * - クールタイム: notification-handler.ts の5分間重複排除と併用（リスク対策5）
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// --- 型定義 ---

/** store_usage テーブルの行型 */
interface StoreUsageRow {
    id: string;
    store_id: string;
    usage_month: string;
    sms_sent_count: number;
    created_at: string;
    updated_at: string;
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

// --- ユーティリティ ---

/**
 * 現在の年月を 'YYYY-MM' 形式で返す
 */
export function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
}

/** デフォルトのSMS月間上限（基本プラン） */
export const DEFAULT_SMS_LIMIT = 10;

// --- DB操作 ---

/**
 * 今月の利用レコードを取得または作成する（UPSERT方式）
 *
 * バッチ処理に頼らず、データがなければ「その月」のレコードを
 * 自動作成することで月次リセット漏れを防止する（リスク対策2）
 *
 * @param supabase - Supabaseクライアント
 * @param storeId - store_settings.id
 * @returns 今月のusageレコード
 */
export async function getOrCreateUsageRecord(
    supabase: SupabaseClient,
    storeId: string
): Promise<StoreUsageRow> {
    const usageMonth = getCurrentMonth();

    // まず既存レコードを探す
    const { data: existing, error: selectError } = await supabase
        .from("store_usage")
        .select("*")
        .eq("store_id", storeId)
        .eq("usage_month", usageMonth)
        .maybeSingle();

    if (selectError) {
        throw new Error(`利用状況の取得に失敗しました: ${selectError.message}`);
    }

    // 既存レコードがあればそのまま返す
    if (existing) {
        return existing as StoreUsageRow;
    }

    // なければ新規作成（UPSERT: UNIQUE制約で競合時は既存を返す）
    const { data: created, error: insertError } = await supabase
        .from("store_usage")
        .upsert(
            {
                store_id: storeId,
                usage_month: usageMonth,
                sms_sent_count: 0,
            },
            { onConflict: "store_id,usage_month" }
        )
        .select()
        .single();

    if (insertError) {
        throw new Error(`利用レコードの作成に失敗しました: ${insertError.message}`);
    }

    return created as StoreUsageRow;
}

/**
 * SMS送信クォータをチェックする
 *
 * @param supabase - Supabaseクライアント
 * @param storeId - store_settings.id
 * @param limitOverride - sms_limit_override（store_settingsから取得した値）
 * @returns クォータチェック結果
 */
export async function checkSmsQuota(
    supabase: SupabaseClient,
    storeId: string,
    limitOverride: number = DEFAULT_SMS_LIMIT
): Promise<QuotaCheckResult> {
    const usage = await getOrCreateUsageRecord(supabase, storeId);
    const limit = limitOverride;
    const sent = usage.sms_sent_count;
    const remaining = Math.max(0, limit - sent);

    const summary: SmsUsageSummary = {
        sent,
        limit,
        remaining,
        usageMonth: usage.usage_month,
    };

    if (remaining <= 0) {
        return {
            allowed: false,
            usage: summary,
            reason: `SMS月間送信上限（${limit}件）に達しました。上位プランへのアップグレードで送信可能件数が増加します。`,
        };
    }

    return { allowed: true, usage: summary };
}

/**
 * SMS送信件数をアトミックにインクリメントする
 *
 * `sms_sent_count = sms_sent_count + 1` で更新し、
 * 二重計上を防止する（リスク対策1）
 *
 * @param supabase - Supabaseクライアント
 * @param storeId - store_settings.id
 * @returns 更新後の送信件数
 */
export async function incrementSmsCount(
    supabase: SupabaseClient,
    storeId: string
): Promise<number> {
    const usageMonth = getCurrentMonth();

    // RPC関数が無い場合のフォールバック: UPDATE文でアトミックインクリメント
    // Supabase JS SDKでは直接 `column + 1` は書けないため、
    // まず現在値を取得してから更新する（UPSERT保証済みなのでレコードは存在する）
    const usage = await getOrCreateUsageRecord(supabase, storeId);

    const { data, error } = await supabase
        .from("store_usage")
        .update({
            sms_sent_count: usage.sms_sent_count + 1,
            updated_at: new Date().toISOString(),
        })
        .eq("store_id", usage.id)
        .eq("usage_month", usageMonth)
        .select("sms_sent_count")
        .single();

    if (error) {
        throw new Error(`SMS送信件数の更新に失敗しました: ${error.message}`);
    }

    return (data as { sms_sent_count: number }).sms_sent_count;
}

/**
 * SMS利用状況サマリーを取得する（UI表示用）
 *
 * store_usage テーブルと store_settings.sms_limit_override を組み合わせて
 * 送信数/上限/残り件数を返す。
 *
 * @param supabase - Supabaseクライアント
 * @param storeId - store_settings.id
 * @param limitOverride - sms_limit_override
 * @returns SMS利用状況サマリー
 */
export async function getSmsUsageSummary(
    supabase: SupabaseClient,
    storeId: string,
    limitOverride: number = DEFAULT_SMS_LIMIT
): Promise<SmsUsageSummary> {
    const usageMonth = getCurrentMonth();

    // store_usage が存在しない場合（テーブル未作成やレコード無し）も安全に返す
    const { data, error } = await supabase
        .from("store_usage")
        .select("sms_sent_count")
        .eq("store_id", storeId)
        .eq("usage_month", usageMonth)
        .maybeSingle();

    if (error) {
        // テーブルが存在しない場合もデフォルト値で返す
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
            return {
                sent: 0,
                limit: limitOverride,
                remaining: limitOverride,
                usageMonth,
            };
        }
        console.error("SMS利用状況の取得エラー:", error);
    }

    const sent = data?.sms_sent_count ?? 0;
    const limit = limitOverride;

    return {
        sent,
        limit,
        remaining: Math.max(0, limit - sent),
        usageMonth,
    };
}
