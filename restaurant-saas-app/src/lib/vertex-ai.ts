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
 * @param modelName モデル名
 * @param skipNormalization 正規化をスキップするか
 * @param inputText 入力テキスト（スマートルーティング用）
 */
export function getGenerativeModel(modelName: string, skipNormalization: boolean = false, inputText?: string) {
    let targetModel = modelName;

    // スマート・ルーティング: 入力テキストに基づいてモデルを最適化
    // 意図的に Pro が指定されている場合を除き、単純な入力には Flash を割り当てる
    if (!skipNormalization && inputText) {
        const isSimple = inputText.length < 100 && !inputText.includes('不満') && !inputText.includes('最悪') && !inputText.includes('待た');
        if (isSimple && targetModel.includes('gemini-3')) {
            targetModel = 'gemini-3-flash-preview'; // 低コストモデルへルーティング
        }
    }

    const normalizedModelName = skipNormalization ? targetModel :
        (targetModel.includes('gemini-2.5-pro') ? 'gemini-2.5-pro' :
            targetModel.includes('gemini-2.5-flash') ? 'gemini-2.5-flash' :
                targetModel.includes('gemini-3') ? targetModel :
                    targetModel.includes('gemini-2.0-flash') ? 'gemini-2.0-flash-001' :
                        'gemini-2.5-flash');

    // Gemini 3系は global エンドポイントが必須
    const location = normalizedModelName.startsWith('gemini-3') ? 'global' : 'us-central1';
    const client = getVertexAIInstance(location);

    return client.getGenerativeModel({
        model: normalizedModelName,
    });
}
