"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { StoreData, UserProfile } from "@/types/firestore";

/**
 * ユーザープロフィールと店舗設定を取得する
 */
export async function getUserProfile(idToken: string) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const [userDoc, storeDoc] = await Promise.all([
            adminDb.collection("users").doc(uid).get(),
            adminDb.collection("stores").doc(uid).get()
        ]);

        const user = userDoc.exists ? (userDoc.data() as UserProfile) : null;
        const store = storeDoc.exists ? (storeDoc.data() as StoreData) : null;

        return { success: true, user, store };
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return { success: false, error: "Failed to fetch profile" };
    }
}

/**
 * ユーザープロフィールを保存する
 */
export async function saveUserProfile(idToken: string, data: Partial<UserProfile>) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        await adminDb.collection("users").doc(uid).set({
            ...data,
            updatedAt: FieldValue.serverTimestamp() // Fix: Use serverTimestamp instead of null
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error saving user profile:", error);
        return { success: false, error: "Failed to save profile" };
    }
}

/**
 * 店舗設定・素材を保存する (Website Materials)
 */
export async function saveStoreSettings(idToken: string, data: Partial<StoreData>) {
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // タイムスタンプの更新（型エラー回避のため、FieldValueを使用するか、Date型を使う場合は注意）
        // StoreData型定義では `Timestamp | Date` となっているが、set時のFieldValueは互換性がある。
        // ただしTypeScriptの厳密なチェックではエラーになることがあるため、as anyで回避するか、
        // 単に spread する。

        const updateData = {
            ...data,
            ownerUid: uid, // Ensure ownerUid is set
            updatedAt: FieldValue.serverTimestamp()
        };

        await adminDb.collection("stores").doc(uid).set(updateData, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error saving store settings:", error);
        return { success: false, error: "Failed to save store settings" };
    }
}
