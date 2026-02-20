import * as admin from "firebase-admin";

// プロジェクトの設定パース
let serviceAccount: any = null;
const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (rawKey && rawKey.trim()) {
    let keyStr = rawKey.trim();
    try {
        // .env.local でクォートされている場合の除去ロジック
        if ((keyStr.startsWith("'") && keyStr.endsWith("'")) || (keyStr.startsWith('"') && keyStr.endsWith('"'))) {
            keyStr = keyStr.substring(1, keyStr.length - 1);
        }

        // JSONとしてパース
        serviceAccount = JSON.parse(keyStr);
    } catch (e: any) {
        console.error("Critical: Failed to parse Firebase service account key.");
    }
}

// 初期化 (Default App)
if (!admin.apps.some(app => app?.name === "[DEFAULT]")) {
    try {
        if (serviceAccount && serviceAccount.project_id) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
            });
            console.log("Firebase Admin initialized for project:", serviceAccount.project_id);
        } else {
            console.warn("Firebase Admin: Initializing with environment-based default credentials.");
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
            });
        }
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
    }
}

// 安全なゲッターを提供
export const adminAuth = (admin.apps.length ? admin.auth() : {} as any) as admin.auth.Auth;
export const adminDb = (admin.apps.length ? admin.firestore() : {} as any) as admin.firestore.Firestore;
export const adminStorage = (admin.apps.length ? admin.storage() : {} as any) as admin.storage.Storage;

/**
 * プロジェクト一本化に伴い、常にメインのDBを返す
 */
export async function getDbForUser(_uid: string): Promise<admin.firestore.Firestore> {
    return adminDb;
}
