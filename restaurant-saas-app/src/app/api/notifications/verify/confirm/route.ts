/**
 * 通知先確認コールバックAPI
 *
 * GET  /api/notifications/verify/confirm?token=xxx
 *   → メール確認リンクからのコールバック。検証成功時にトーン設定画面へリダイレクト。
 *
 * POST /api/notifications/verify/confirm
 *   → SMS OTPコード検証。{ otp: "123456" } を受け取り、JSONレスポンスを返す。
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NotificationConfig } from "@/lib/notification-handler";

/**
 * メール確認リンクのコールバック処理（GET）
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
        return NextResponse.redirect(
            `${origin}/settings/account?verify_error=missing_token`
        );
    }

    const supabase = await createClient();

    // ユーザー認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.redirect(
            `${origin}/login?error=auth_required`
        );
    }

    // トークン検索
    const { data: verification, error: fetchError } = await supabase
        .from("notification_verifications")
        .select("*")
        .eq("token", token)
        .eq("user_id", user.id)
        .eq("channel", "email")
        .eq("verified", false)
        .maybeSingle();

    if (fetchError || !verification) {
        return NextResponse.redirect(
            `${origin}/settings/account?verify_error=invalid_token`
        );
    }

    // 有効期限チェック
    if (new Date(verification.expires_at) < new Date()) {
        return NextResponse.redirect(
            `${origin}/settings/account?verify_error=expired_token`
        );
    }

    // トークンを検証済みに更新
    await supabase
        .from("notification_verifications")
        .update({ verified: true })
        .eq("id", verification.id);

    // notification_config のメールアドレスと検証フラグを更新
    const { data: settings } = await supabase
        .from("store_settings")
        .select("notification_config")
        .eq("user_id", user.id)
        .maybeSingle();

    if (settings) {
        const currentConfig = (settings.notification_config || {}) as NotificationConfig;
        const updatedConfig: NotificationConfig = {
            ...currentConfig,
            email_address: verification.contact_value,
            email_verified: true,
        };

        await supabase
            .from("store_settings")
            .update({
                notification_config: updatedConfig,
                updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);
    }

    return NextResponse.redirect(
        `${origin}/settings/account?verified=email`
    );
}

/**
 * SMS OTPコード検証処理（POST）
 */
export async function POST(request: Request) {
    try {
        const { otp } = await request.json();

        if (!otp || typeof otp !== "string" || otp.length !== 6) {
            return NextResponse.json(
                { error: "6桁の認証コードを入力してください" },
                { status: 400 }
            );
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

        // OTPコード検索
        const { data: verification, error: fetchError } = await supabase
            .from("notification_verifications")
            .select("*")
            .eq("token", otp)
            .eq("user_id", user.id)
            .eq("channel", "sms")
            .eq("verified", false)
            .maybeSingle();

        if (fetchError || !verification) {
            return NextResponse.json(
                { error: "認証コードが正しくありません" },
                { status: 400 }
            );
        }

        // 有効期限チェック
        if (new Date(verification.expires_at) < new Date()) {
            // 期限切れトークンを削除
            await supabase
                .from("notification_verifications")
                .delete()
                .eq("id", verification.id);

            return NextResponse.json(
                { error: "認証コードの有効期限が切れています。再送信してください。" },
                { status: 400 }
            );
        }

        // トークンを検証済みに更新
        await supabase
            .from("notification_verifications")
            .update({ verified: true })
            .eq("id", verification.id);

        // notification_config の電話番号と検証フラグを更新
        const { data: settings } = await supabase
            .from("store_settings")
            .select("notification_config")
            .eq("user_id", user.id)
            .maybeSingle();

        if (settings) {
            const currentConfig = (settings.notification_config || {}) as NotificationConfig;
            const updatedConfig: NotificationConfig = {
                ...currentConfig,
                phone_number: verification.contact_value,
                phone_verified: true,
            };

            await supabase
                .from("store_settings")
                .update({
                    notification_config: updatedConfig,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
        }

        return NextResponse.json({
            success: true,
            message: "電話番号が認証されました",
        });
    } catch (error: unknown) {
        console.error("OTP検証エラー:", error);
        let message = "認証に失敗しました";
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
