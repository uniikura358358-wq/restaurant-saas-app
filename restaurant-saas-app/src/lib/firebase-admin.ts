import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (key) {
            const serviceAccount = JSON.parse(key);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        } else {
            // Fallback for build environments without keys
            console.warn("Firebase Admin: No keys found, using mock initialization.");
            admin.initializeApp({ projectId: "mock-project-id" });
        }
    } catch (error) {
        console.error('Firebase Admin initialization error', error);
        // Ensure app is initialized to prevent nextjs build failure
        if (!admin.apps.length) {
            admin.initializeApp({ projectId: "mock-project-id" });
        }
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
