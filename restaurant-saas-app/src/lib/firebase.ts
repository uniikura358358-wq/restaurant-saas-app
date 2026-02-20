import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
    getFirestore,
    Firestore,
    initializeFirestore,
    memoryLocalCache,
    disableNetwork
} from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getStorage, FirebaseStorage } from "firebase/storage";

// 環境変数の取得
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// シングルトンインスタンスの保持
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

// Demoモード判定
const isDemoMode =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "demo-project" ||
    process.env.NEXT_PUBLIC_IS_DEMO === "true";

try {
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);

        // 【修正点】Firestore初期化設定
        // 永続化キャッシュ（IndexedDB）によるエラーを回避するため、メモリキャッシュを強制
        db = initializeFirestore(app, {
            localCache: memoryLocalCache()
        });

        // 【修正点】Demoモード時のネットワーク遮断
        // ダミーProjectIDへの接続試行による "Client is offline" エラーを根絶する
        if (isDemoMode && typeof window !== 'undefined') {
            disableNetwork(db).catch((e) => {
                console.warn("Demo Mode: Network disable failed", e);
            });
        }
    } else {
        app = getApp();
        db = getFirestore(app);
        // 既存インスタンス取得時もDemoモードなら念のため切断を試行
        if (isDemoMode && typeof window !== 'undefined') {
            disableNetwork(db).catch(() => { });
        }
    }
    auth = getAuth(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Firebase initialization failed:", error);
}

export { auth, db, storage };
