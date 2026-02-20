"use server";

import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { StoreData, UserProfile } from "@/types/firestore";

/**
 * ユーザープロフィールと店舗設定を取得する
 */
export async function getUserProfile(idToken: string) {
    try {
        const { verifyAuth } = await import("@/lib/auth-utils");
        const user = await verifyAuth(idToken);
        if (!user) {
            return { success: false, error: "Unauthorized" };
        }
        const uid = user.uid;

        // デモユーザー対応
        if (uid === "demo-user-id") {
            return {
                success: true,
                user: { uid, email: "demo@example.com", displayName: "デモユーザー", plan: "Standard", createdAt: new Date() },
                store: { storeName: "デモ店舗", ownerUid: uid, aiTone: "polite" }
            };
        }

        const { getDbForUser } = await import("@/lib/firebase-admin");
        const db = await getDbForUser(uid);

        const [userDoc, storeDoc] = await Promise.all([
            db.collection("users").doc(uid).get(),
            db.collection("stores").doc(uid).get()
        ]);

        const userProfile = userDoc.exists ? (userDoc.data() as UserProfile) : null;
        const store = storeDoc.exists ? (storeDoc.data() as StoreData) : null;

        return { success: true, user: userProfile, store };
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
        const { verifyAuth } = await import("@/lib/auth-utils");
        const user = await verifyAuth(idToken);
        if (!user) return { success: false, error: "Unauthorized" };
        const uid = user.uid;
        if (uid === "demo-user-id") return { success: true };

        const { getDbForUser } = await import("@/lib/firebase-admin");
        const db = await getDbForUser(uid);

        await db.collection("users").doc(uid).set({
            ...data,
            updatedAt: FieldValue.serverTimestamp()
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
        const { verifyAuth } = await import("@/lib/auth-utils");
        const user = await verifyAuth(idToken);
        if (!user) return { success: false, error: "Unauthorized" };
        const uid = user.uid;
        if (uid === "demo-user-id") return { success: true };

        const { getDbForUser } = await import("@/lib/firebase-admin");
        const db = await getDbForUser(uid);

        const updateData = {
            ...data,
            ownerUid: uid,
            updatedAt: FieldValue.serverTimestamp()
        };

        await db.collection("stores").doc(uid).set(updateData, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error saving store settings:", error);
        return { success: false, error: "Failed to save store settings" };
    }
}
