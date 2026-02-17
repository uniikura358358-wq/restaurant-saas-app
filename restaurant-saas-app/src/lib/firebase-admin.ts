import * as admin from "firebase-admin";

// Safe parsing of service account key
let serviceAccount: any = null;
const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (rawKey && rawKey.trim()) {
    try {
        // 改行コードが含まれている可能性があるため、フィルタリング等が必要な場合があるが、まずはパース
        serviceAccount = JSON.parse(rawKey);
    } catch (e) {
        console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Admin features may be limited.");
    }
}

if (!admin.apps.length) {
    try {
        if (serviceAccount && serviceAccount.project_id) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
        } else {
            // Fallback: サービスアカウントがない場合は、少なくともプロジェクトIDが環境変数にあればそれを使う
            admin.initializeApp({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
            });
        }
    } catch (error) {
        console.error("Firebase Admin initialization failed:", error);
    }
}

// Helper to safely get instances
const getAuthSafe = () => {
    try {
        return admin.apps.length ? admin.auth() : {} as any;
    } catch (e) {
        return {} as any;
    }
};

const getDbSafe = () => {
    try {
        return admin.apps.length ? admin.firestore() : {} as any;
    } catch (e) {
        return {} as any;
    }
};

export const adminAuth = getAuthSafe() as admin.auth.Auth;
export const adminDb = getDbSafe() as admin.firestore.Firestore;
