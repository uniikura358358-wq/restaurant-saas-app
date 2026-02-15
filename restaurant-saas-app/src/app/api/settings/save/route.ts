import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isValidEmail, isValidPhone } from "@/lib/notification-handler";

export async function POST(request: Request) {
    try {
        const { store_name, store_area, ai_tone, default_signature, emoji_level, reply_config, notification_config, sms_limit_override, reply_templates } = await request.json();

        // バリデーション
        // store_name が送信された場合のみチェック（空文字禁止など）
        if (store_name !== undefined && typeof store_name !== "string") {
            return NextResponse.json(
                { error: "店舗名の形式が正しくありません" },
                { status: 400 }
            );
        }

        if (store_area !== undefined && typeof store_area !== "string") {
            return NextResponse.json(
                { error: "店舗所在地（エリア）の形式が正しくありません" },
                { status: 400 }
            );
        }

        // ai_tone の値チェック（送信された場合のみ）
        const validTones = ["polite", "friendly", "energetic"];
        if (ai_tone !== undefined && !validTones.includes(ai_tone)) {
            return NextResponse.json(
                { error: "無効なAIトーンです" },
                { status: 400 }
            );
        }

        // emoji_level のバリデーション（存在する場合）
        if (emoji_level !== undefined && (typeof emoji_level !== "number" || emoji_level < 0 || emoji_level > 3)) {
            return NextResponse.json(
                { error: "絵文字量は0〜3の範囲で指定してください" },
                { status: 400 }
            );
        }

        // reply_config のバリデーション（存在する場合）
        if (reply_config !== undefined) {
            const validModes = ["auto", "manual"];
            const stars = ["1", "2", "3", "4", "5"];
            for (const s of stars) {
                if (reply_config[s] && !validModes.includes(reply_config[s])) {
                    return NextResponse.json(
                        { error: `星${s}の設定値が不正です` },
                        { status: 400 }
                    );
                }
            }
        }

        // reply_templates のバリデーション（存在する場合）
        if (reply_templates !== undefined && typeof reply_templates !== "object") {
            return NextResponse.json(
                { error: "定型文の設定が不正です" },
                { status: 400 }
            );
        }

        // notification_config のバリデーション（存在する場合）
        if (notification_config !== undefined) {
            if (notification_config.email_enabled && notification_config.email_address && !isValidEmail(notification_config.email_address)) {
                return NextResponse.json(
                    { error: "メールアドレスの形式が正しくありません" },
                    { status: 400 }
                );
            }
            if (notification_config.sms_enabled && notification_config.phone_number && !isValidPhone(notification_config.phone_number)) {
                return NextResponse.json(
                    { error: "電話番号は国際形式（+81...）で入力してください" },
                    { status: 400 }
                );
            }
        }

        // sms_limit_override のバリデーション（存在する場合）
        // リスク対策4: プラン変更時に即座に上限を変更可能
        if (sms_limit_override !== undefined) {
            if (typeof sms_limit_override !== "number" || sms_limit_override < 0 || sms_limit_override > 100) {
                return NextResponse.json(
                    { error: "SMS月間上限は0〜100の範囲で指定してください" },
                    { status: 400 }
                );
            }
        }

        const supabase = await createClient();

        // ユーザー認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: "認証されていません" },
                { status: 401 }
            );
        }

        // 既存の設定を確認（該当ユーザーのもの）
        const { data: existing } = await supabase
            .from("store_settings")
            .select("id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        let data;
        let error;

        if (existing) {
            // 既存レコードを更新（部分更新）
            const updateData: Record<string, unknown> = {
                updated_at: new Date().toISOString()
            };
            if (store_name !== undefined) updateData.store_name = store_name;
            if (store_area !== undefined) updateData.store_area = store_area || null;
            if (ai_tone !== undefined) updateData.ai_tone = ai_tone;
            if (default_signature !== undefined) updateData.default_signature = default_signature || null;
            if (emoji_level !== undefined) updateData.emoji_level = emoji_level;
            if (reply_config !== undefined) updateData.reply_config = reply_config;
            if (reply_templates !== undefined) updateData.reply_templates = reply_templates;
            if (notification_config !== undefined) updateData.notification_config = notification_config;
            if (sms_limit_override !== undefined) updateData.sms_limit_override = sms_limit_override;

            const result = await supabase
                .from("store_settings")
                .update(updateData)
                .eq("id", existing.id)
                .select()
                .maybeSingle();
            data = result.data;
            error = result.error;
        } else {
            // 新規レコードを作成
            // 必須フィールドが欠けている場合はデフォルト値を使用
            const result = await supabase
                .from("store_settings")
                .insert({
                    user_id: user.id,
                    store_name: store_name ?? "", // 新規作成時は空文字許容
                    store_area: store_area || null,
                    ai_tone: ai_tone ?? "polite",
                    default_signature: default_signature || null,
                    ...(emoji_level !== undefined && { emoji_level }),
                    ...(reply_config !== undefined && { reply_config }),
                    ...(reply_templates !== undefined && { reply_templates }),
                    ...(notification_config !== undefined && { notification_config }),
                    ...(sms_limit_override !== undefined && { sms_limit_override }),
                })
                .select()
                .maybeSingle();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error("Settings save error:", error);
            throw error;
        }

        // 設定変更時にキャッシュを即座にパージ
        revalidatePath("/settings");
        revalidatePath("/settings/store");
        revalidatePath("/settings/account");

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        console.error("Settings POST error:", error);
        let message = "設定の保存に失敗しました";
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
