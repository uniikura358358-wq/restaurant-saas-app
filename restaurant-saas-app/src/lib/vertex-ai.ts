import { VertexAI } from "@google-cloud/vertexai";

/**
 * Vertex AI の初期化とインスタンス提供
 * 
 * Firebase Admin SDK のサービスアカウント情報を流用して認証を行う。
 */

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// ロケーションごとのインスタンスキャッシュ
const instances: Record<string, VertexAI> = {};

const getVertexAIInstance = (location: string = "us-central1") => {
    if (instances[location]) return instances[location];

    const cleanProjectId = (projectId && projectId !== "dummy-project") ? projectId : undefined;

    if (serviceAccount) {
        try {
            const credentials = JSON.parse(serviceAccount);
            const finalProjectId = cleanProjectId || (credentials.project_id !== "dummy-project" ? credentials.project_id : undefined);

            const options: any = {
                project: finalProjectId,
                location: location,
                googleAuthOptions: {
                    credentials: {
                        client_email: credentials.client_email,
                        private_key: credentials.private_key,
                    }
                }
            };

            // global ロケーションの場合は明示的にエンドポイントを指定
            if (location === "global") {
                options.apiEndpoint = "aiplatform.googleapis.com";
            }

            instances[location] = new VertexAI(options);
            return instances[location];
        } catch (error) {
            console.error(`Failed to parse service account for Vertex AI (${location}):`, error);
        }
    }

    const fallbackOptions: any = {
        project: cleanProjectId,
        location: location,
    };
    if (location === "global") {
        fallbackOptions.apiEndpoint = "aiplatform.googleapis.com";
    }

    instances[location] = new VertexAI(fallbackOptions);
    return instances[location];
};

/**
 * 指定したモデルのジェネレーティブモデルを取得する
 * 
 * 運用規則（rules.md）に基づき、レスポンスの速い Flash モデルを最優先する。
 * @param modelName モデル名（指定は尊重するが、正規化プロセスで Flash が優先される）
 * @param skipNormalization 正規化をスキップするか
 */
export function getGenerativeModel(modelName: string, skipNormalization: boolean = false) {
    // 運用規則により Flash モデルをメインで使用する
    // 指定されたモデル名に Pro が含まれていても、基本的には Flash へ誘導する（安定性重視）
    const targetModel = modelName;

    const normalizedModelName = skipNormalization ? targetModel :
        (targetModel.includes('3') ? 'gemini-3-flash-preview' :
            targetModel.includes('2.5') ? 'gemini-2.5-flash' :
                'gemini-2.5-flash'); // 安定性を重視し、標準で 2.5-flash を使用

    // Gemini 3系は global エンドポイントが必須
    const location = normalizedModelName.startsWith('gemini-3') ? 'global' : 'us-central1';
    const client = getVertexAIInstance(location);

    return client.getGenerativeModel({
        model: normalizedModelName,
    });
}
