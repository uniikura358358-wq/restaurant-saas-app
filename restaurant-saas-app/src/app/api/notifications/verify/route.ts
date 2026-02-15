/**
 * 通知先確認トークン生成・送信API
 *
 * POST /api/notifications/verify
 * - メール: UUIDトークン → 確認リンクをメール送信（プレースホルダ）
 * - SMS: 6桁OTPコード → SMS送信（プレースホルダ）
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID, randomInt } from "crypto";
import { isValidEmail, isValidPhone } from "@/lib/notification-handler";

/** トークン有効期限: メール=24時間、SMS=10分 */
const EMAIL_TOKEN_EXPIRES_HOURS = 24;
const SMS_OTP_EXPIRES_MINUTES = 10;

export async function POST(request: Request) {
    try {
        const { channel, contact_value } = await request.json();

        // バリデーション: チャネル
        if (!channel || !["email", "sms"].includes(channel)) {
            return NextResponse.json(
                { error: "チャネルは 'email' または 'sms' を指定してください" },
                { status: 400 }
            );
        }

        // バリデーション: 連絡先
        if (!contact_value) {
            return NextResponse.json(
                { error: "連絡先を入力してください" },
                { status: 400 }
            );
        }

        if (channel === "email" && !isValidEmail(contact_value)) {
            return NextResponse.json(
                { error: "メールアドレスの形式が正しくありません" },
                { status: 400 }
            );
        }

        if (channel === "sms" && !isValidPhone(contact_value)) {
            return NextResponse.json(
                { error: "電話番号は国際形式（+81...）で入力してください" },
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

        // トークン生成: メール=UUID、SMS=6桁OTP
        const token = channel === "email"
            ? randomUUID()
            : String(randomInt(100000, 999999));

        // 有効期限計算
        const expiresAt = new Date();
        if (channel === "email") {
            expiresAt.setHours(expiresAt.getHours() + EMAIL_TOKEN_EXPIRES_HOURS);
        } else {
            expiresAt.setMinutes(expiresAt.getMinutes() + SMS_OTP_EXPIRES_MINUTES);
        }

        // 同一ユーザー・同一チャネルの未検証トークンを削除（上書き）
        await supabase
            .from("notification_verifications")
            .delete()
            .eq("user_id", user.id)
            .eq("channel", channel)
            .eq("verified", false);

        // 新しいトークンを保存
        const { error: insertError } = await supabase
            .from("notification_verifications")
            .insert({
                user_id: user.id,
                channel,
                contact_value,
                token,
                verified: false,
                expires_at: expiresAt.toISOString(),
            });

        if (insertError) {
            console.error("トークン保存エラー:", insertError);
            throw insertError;
        }

        // --- メール/SMS送信（プレースホルダ） ---
        if (channel === "email") {
            // TODO: Resend / SendGrid 連携時に実際のメール送信を実装
            const origin = request.headers.get("origin") || "http://localhost:3000";
            const confirmUrl = `${origin}/api/notifications/verify/confirm?token=${token}`;
            console.log(`[確認メール送信（プレースホルダ）] to=${contact_value}, url=${confirmUrl}`);
        } else {
            // TODO: Twilio 連携時に実際のSMS送信を実装
            console.log(`[確認SMS送信（プレースホルダ）] to=${contact_value}, OTP=${token}`);
        }

        return NextResponse.json({
            success: true,
            message: channel === "email"
                ? "確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。"
                : "確認コードを送信しました。届いた6桁のコードを入力してください。",
        });
    } catch (error: unknown) {
        console.error("通知先確認APIエラー:", error);
        let message = "確認の送信に失敗しました";
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
