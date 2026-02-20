/**
 * 通知先確認コールバックAPI
 *
 * GET  /api/notifications/verify/confirm?token=xxx
 *   → メール確認リンクからのコールバック。検証成功時にトーン設定画面へリダイレクト。
 *
 * POST /api/notifications/verify/confirm
 *   → SMS OTPコード検証。{ otp: "123456" } を受け取り、JSONレスポンスを返す。
 */

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import type { NotificationConfig } from "@/lib/notification-handler";

export const dynamic = 'force-dynamic';

/**
 * メール確認リンクのコールバック処理（GET）
 */
export async function GET(request: Request) {
    try {
        const { searchParams, origin } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.redirect(
                `${origin}/settings/account?verify_error=missing_token`
            );
        }

        // 1. トークン検索（プロジェクトを跨いで検索）
        const { adminDbSecondary, getDbForUser } = await import("@/lib/firebase-admin");

        let snapshot = await adminDb.collection("verificationCodes")
            .where("token", "==", token)
            .where("channel", "==", "email")
            .where("verified", "==", false)
            .limit(1)
            .get();

        let db = adminDb;

        if (snapshot.empty) {
            snapshot = await adminDbSecondary.collection("verificationCodes")
                .where("token", "==", token)
                .where("channel", "==", "email")
                .where("verified", "==", false)
                .limit(1)
                .get();
            db = adminDbSecondary;
        }

        if (snapshot.empty) {
            return NextResponse.redirect(
                `${origin}/settings/account?verify_error=invalid_token`
            );
        }

        const verificationDoc = snapshot.docs[0];
        const verification = verificationDoc.data();
        const userId = verification.userId;

        // 有効期限チェック
        if (verification.expiresAt && new Date(verification.expiresAt.toDate()) < new Date()) {
            return NextResponse.redirect(
                `${origin}/settings/account?verify_error=expired_token`
            );
        }

        // トークンを検証済みに更新
        await verificationDoc.ref.update({ verified: true });

        // users/{userId} の notificationConfig を更新
        // db は上で特定されたものを使用
        const userRef = db.collection("users").doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const currentConfig = (userData?.notificationConfig || {}) as NotificationConfig;

            const updatedConfig: NotificationConfig = {
                ...currentConfig,
                email_address: verification.contactValue,
                email_verified: true,
            };

            await userRef.update({
                notificationConfig: updatedConfig,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        return NextResponse.redirect(
            `${origin}/settings/account?verified=email`
        );

    } catch (error: any) {
        console.error("Verify Confirm Error:", error);
        // リダイレクトでエラーを伝える
        const origin = new URL(request.url).origin;
        return NextResponse.redirect(
            `${origin}/settings/account?verify_error=server_error`
        );
    }
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

        // ユーザー認証チェック
        const { verifyAuth } = await import("@/lib/auth-utils");
        const user = await verifyAuth(request);
        if (!user) {
            return NextResponse.json({ error: "認証されていません" }, { status: 401 });
        }
        const uid = user.uid;

        const { getDbForUser } = await import("@/lib/firebase-admin");
        const db = await getDbForUser(uid);

        // OTPコード検索
        const snapshot = await db.collection("verificationCodes")
            .where("token", "==", otp)
            .where("userId", "==", uid)
            .where("channel", "==", "sms")
            .where("verified", "==", false)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return NextResponse.json(
                { error: "認証コードが正しくありません" },
                { status: 400 }
            );
        }

        const verificationDoc = snapshot.docs[0];
        const verification = verificationDoc.data();

        // 有効期限チェック
        if (verification.expiresAt && new Date(verification.expiresAt.toDate()) < new Date()) {
            await verificationDoc.ref.delete();
            return NextResponse.json(
                { error: "認証コードの有効期限が切れています。再送信してください。" },
                { status: 400 }
            );
        }

        // トークンを検証済みに更新
        await verificationDoc.ref.update({ verified: true });

        // users/{userId} の notificationConfig を更新
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            const currentConfig = (userData?.notificationConfig || {}) as NotificationConfig;

            const updatedConfig: NotificationConfig = {
                ...currentConfig,
                phone_number: verification.contactValue,
                phone_verified: true,
            };

            await userRef.update({
                notificationConfig: updatedConfig,
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        return NextResponse.json({
            success: true,
            message: "電話番号が認証されました",
        });

    } catch (error: any) {
        console.error("OTP Verification Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
