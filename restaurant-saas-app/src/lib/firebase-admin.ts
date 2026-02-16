import * as admin from "firebase-admin";

// Safe parsing of service account key
let serviceAccount;
try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
} catch (e) {
    console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. using empty object.");
    serviceAccount = {};
}

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error) {
        console.error("Firebase Admin initialization failed (likely due to build-time dummy env vars):", error);
        // Fallback: Try initializing without credentials to allow build to proceed (auth/db exports won't verify but won't crash immediately)
        try {
            if (!admin.apps.length) admin.initializeApp();
        } catch (e) {
            console.warn("Fallback initialization also failed:", e);
        }
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
