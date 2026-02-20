import * as admin from "firebase-admin";

// 1つ目のプロジェクトの設定パース
let serviceAccount1: any = null;
const rawKey1 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (rawKey1 && rawKey1.trim()) {
    try { serviceAccount1 = JSON.parse(rawKey1); } catch (e) { console.warn("Failed to parse primary Firebase key."); }
}

// 2つ目のプロジェクトの設定パース
let serviceAccount2: any = null;
const rawKey2 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_SECONDARY;
if (rawKey2 && rawKey2.trim()) {
    try { serviceAccount2 = JSON.parse(rawKey2); } catch (e) { console.warn("Failed to parse secondary Firebase key."); }
}

// 1つ目 (Default App) の初期化
if (!admin.apps.some(app => app?.name === "[DEFAULT]")) {
    try {
        if (serviceAccount1 && serviceAccount1.project_id) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount1),
                projectId: serviceAccount1.project_id
            });
        } else {
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
            });
        }
    } catch (error) {
        console.error("Primary Firebase Admin initialization failed:", error);
    }
}

// 2つ目 (Secondary App) の初期化
if (serviceAccount2 && !admin.apps.some(app => app?.name === "secondary")) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount2),
            projectId: serviceAccount2.project_id
        }, "secondary");
        console.log("Secondary Firebase Project Initialized:", serviceAccount2.project_id);
    } catch (error) {
        console.error("Secondary Firebase Admin initialization failed:", error);
    }
}

// ヘルパー：安全にインスタンスを取得
export const adminAuth = (admin.apps.length ? admin.auth() : {} as any) as admin.auth.Auth;
export const adminDb = (admin.apps.length ? admin.firestore() : {} as any) as admin.firestore.Firestore;
export const adminStorage = (admin.apps.length ? admin.storage() : {} as any) as admin.storage.Storage;

// 2つ目のDBを公開
const secondaryApp = admin.apps.find(app => app?.name === "secondary");
export const adminDbSecondary = (secondaryApp ? admin.firestore(secondaryApp) : adminDb) as admin.firestore.Firestore;
export const adminAuthSecondary = (secondaryApp ? admin.auth(secondaryApp) : adminAuth) as admin.auth.Auth;
export const adminStorageSecondary = (secondaryApp ? admin.storage(secondaryApp) : adminStorage) as admin.storage.Storage;

/**
 * ユーザーIDに基づいて、適切なプロジェクトのデータベースインスタンスを返す
 */
export async function getDbForUser(uid: string): Promise<admin.firestore.Firestore> {
    if (uid === "demo-user-id") return adminDb; // デモは Primary 固定（または Mock 処理側で分岐）

    try {
        const doc = await adminDb.collection("users").doc(uid).get();
        if (doc.exists) return adminDb;
    } catch (e) {
        console.warn("Primary DB lookup failed for UID, using secondary.");
    }

    return adminDbSecondary;
}
