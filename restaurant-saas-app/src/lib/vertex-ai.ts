import { VertexAI } from "@google-cloud/vertexai";

/**
 * Vertex AI の初期化とインスタンス提供
 * 
 * Firebase Admin SDK のサービスアカウント情報を流用して認証を行う。
 */

const getVertexAI = () => {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    // 優先順位: サーバーサイド専用ID > 公開ID > フォールバックなし
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const location = "us-central1";

    // プロジェクトIDがダミー値の場合は実質未設定として扱う
    const cleanProjectId = (projectId && projectId !== "dummy-project") ? projectId : undefined;

    if (serviceAccount) {
        try {
            const credentials = JSON.parse(serviceAccount);
            const finalProjectId = cleanProjectId || (credentials.project_id !== "dummy-project" ? credentials.project_id : undefined);

            return new VertexAI({
                project: finalProjectId, // undefined の場合は ADC (Application Default Credentials) が試行される
                location: location,
                googleAuthOptions: {
                    credentials: {
                        client_email: credentials.client_email,
                        private_key: credentials.private_key,
                    }
                }
            });
        } catch (error) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY for Vertex AI:", error);
        }
    }

    // フォールバック: 環境変数または ADC
    return new VertexAI({
        project: cleanProjectId,
        location: location,
    });
};

export const vertexAI = getVertexAI();

/**
 * 指定したモデルのジェネレーティブモデルを取得する
 * @param modelName モデル名 (例: 'gemini-1.5-flash', 'gemini-1.5-pro')
 */
export function getGenerativeModel(modelName: string) {
    const normalizedModelName = modelName.includes('gemini-3-flash-preview') ? 'gemini-2.0-flash-001' : // メイン
        modelName.includes('gemini-2.5-flash') ? 'gemini-2.0-flash-001' : // サブ
            modelName.includes('gemini-1.5-flash') ? 'gemini-1.5-flash-002' :
                modelName.includes('gemini-1.5-pro') ? 'gemini-1.5-pro-002' :
                    modelName;

    return vertexAI.getGenerativeModel({
        model: normalizedModelName,
    });
}
