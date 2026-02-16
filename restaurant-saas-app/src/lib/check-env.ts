export const requiredEnvVars = [
    // Firebase Client
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",

    // Firebase Admin
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",

    // AI
    "GOOGLE_API_KEY",
] as const;

export function checkRequiredEnvVars() {
    const missingVars: string[] = [];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missingVars.push(envVar);
        }
    }

    if (missingVars.length > 0) {
        const errorMessage = `
❌ CRITICAL ERROR: Missing required environment variables!
The application cannot start because the following variables are missing:

${missingVars.map((v) => `- ${v}`).join("\n")}

Please check your .env.local file.
    `;

        // 開発環境ではコンソールに出力し、エラーを投げる
        if (process.env.NODE_ENV === "development") {
            console.error(errorMessage);
        }

        // サーバーサイドでの実行時のみエラーを投げてプロセスを止める（ビルド破綻を防ぐため条件付き推奨だが、今回は厳格に）
        throw new Error(errorMessage);
    }

    console.log("✅ Environment variables check passed.");
}
