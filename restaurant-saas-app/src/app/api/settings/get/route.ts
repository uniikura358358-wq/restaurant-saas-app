import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSmsUsageSummary, DEFAULT_SMS_LIMIT } from "@/lib/sms-quota";

/** notification_config のデフォルト値 */
const DEFAULT_NOTIFICATION_CONFIG = {
    email_enabled: false,
    sms_enabled: false,
    email_address: "",
    phone_number: "",
    target_stars: [1, 2],
    silent_hours: { start: "23:00", end: "08:00" },
    last_notified_at: null,
};

/** notification_config 以外のデフォルト値 */
const DEFAULT_SETTINGS = {
    store_name: "",
    store_area: "",
    ai_tone: "polite",
    default_signature: "",
    emoji_level: 2,
    reply_config: { "1": "manual", "2": "manual", "3": "auto", "4": "auto", "5": "auto" },
    notification_config: DEFAULT_NOTIFICATION_CONFIG,
    sms_limit_override: DEFAULT_SMS_LIMIT,
    sms_usage: { sent: 0, limit: DEFAULT_SMS_LIMIT, remaining: DEFAULT_SMS_LIMIT, usageMonth: "" },
};

export async function GET() {
    try {
        const supabase = await createClient();

        // ユーザー認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(DEFAULT_SETTINGS);
        }

        // 設定を取得（該当ユーザーのもの）
        const { data, error } = await supabase
            .from("store_settings")
            .select("*")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (error) {
            // テーブルが存在しない場合はデフォルト値を返す
            if (error.code === "42P01" || error.message?.includes("does not exist")) {
                console.warn("store_settings table does not exist, returning defaults");
                return NextResponse.json(DEFAULT_SETTINGS);
            }
            console.error("Settings fetch error:", error);
            throw error;
        }

        // データがない場合はデフォルト値を返す
        if (!data) {
            return NextResponse.json(DEFAULT_SETTINGS);
        }

        // SMS利用状況をDBから取得（store_usage テーブル）
        const smsLimitOverride = data.sms_limit_override ?? DEFAULT_SMS_LIMIT;
        let smsUsage = { sent: 0, limit: smsLimitOverride, remaining: smsLimitOverride, usageMonth: "" };
        try {
            smsUsage = await getSmsUsageSummary(supabase, data.id, smsLimitOverride);
        } catch {
            // store_usage テーブルが未作成の場合はデフォルト値を使用
        }

        // DBにカラムが存在しない場合のフォールバック
        const result = {
            ...data,
            store_area: data.store_area ?? "",
            emoji_level: data.emoji_level ?? 2,
            reply_config: data.reply_config ?? DEFAULT_SETTINGS.reply_config,
            notification_config: data.notification_config ?? DEFAULT_NOTIFICATION_CONFIG,
            sms_limit_override: smsLimitOverride,
            sms_usage: smsUsage,
            /** フロントエンドでデフォルトメールアドレスとして使用 */
            user_email: user.email ?? "",
        };

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error("Settings GET error:", error);
        let message = "設定の取得に失敗しました";
        if (error instanceof Error) {
            message = error.message;
        } else if (error && typeof error === "object" && "message" in error) {
            message = String((error as { message: unknown }).message);
        }
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
