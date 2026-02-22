import { VertexAI } from "@google-cloud/vertexai";

/**
 * Vertex AI の初期化とインスタンス提供
 * 恒久固定規則：
 * メイン: gemini-3-flash-preview (Thinking Level: LOW)
 * サブ: gemini-2.5-flash
 */

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// ロケーションごとのインスタンスキャッシュ
const instances: Record<string, VertexAI> = {};

export const AI_POLICY = {
    PRIMARY: "gemini-3-flash-preview",
    SECONDARY: "gemini-2.5-flash",
    IMAGE: "gemini-2.5-flash-image", // 通称: ナノバナナ
    THINKING_CONFIG_LOW: { thinking_config: { include_thoughts: false, thinking_level: 'LOW' } }
};

/**
 * プラン名に基づいてメイン/サブのモデルを決定する。
 *
 * Standard:           メイン=gemini-2.5-flash         サブ=gemini-3-flash-preview(LOW)
 * Pro / Pro Premium:  メイン=gemini-3-flash-preview(LOW) サブ=gemini-2.5-flash
 *
 * ※ Pro系のメインモデルには必ず THINKING_CONFIG_LOW を適用すること。
 */
export function getPlanAiPolicy(planName: string): {
    primary: string;
    secondary: string;
    primaryNeedsThinking: boolean;
    secondaryNeedsThinking: boolean;
} {
    const plan = (planName || '').toLowerCase();
    // 'pro' または 'premium' を含む場合は Pro 扱い（web Pro / Pro Premium 等も対応）
    const isPro = plan.includes('pro') || plan.includes('premium');
    return isPro
        ? { primary: AI_POLICY.PRIMARY, secondary: AI_POLICY.SECONDARY, primaryNeedsThinking: true, secondaryNeedsThinking: false }
        : { primary: AI_POLICY.SECONDARY, secondary: AI_POLICY.PRIMARY, primaryNeedsThinking: false, secondaryNeedsThinking: true };
}




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
 * 運用規則に基づき、Gemini 3 Flash Preview を最優先し、LOW設定を適用する。
 */
export function getGenerativeModel(modelName: string, skipNormalization: boolean = false) {
    const targetModel = modelName;

    // 正規化ロジック (規則に基づき、3系をメイン、2.5系をサブ、imageをナノバナナへ誘導)
    const normalizedModelName = skipNormalization ? targetModel :
        (targetModel.includes('3') ? AI_POLICY.PRIMARY :
            targetModel.includes('image') || targetModel === 'imagen' ? AI_POLICY.IMAGE :
                targetModel.includes('2.5') ? AI_POLICY.SECONDARY :
                    AI_POLICY.PRIMARY);

    // Gemini 3系は global エンドポイントが必須
    // 画像生成モデル (Nano Banana) は us-central1 を推奨
    const location = normalizedModelName.startsWith('gemini-3') ? 'global' : 'us-central1';
    const client = getVertexAIInstance(location);

    return client.getGenerativeModel({
        model: normalizedModelName,
        // デフォルトで LOW 設定を適用（Gemini 3系の場合）
        generationConfig: normalizedModelName.startsWith('gemini-3') ? AI_POLICY.THINKING_CONFIG_LOW : undefined
    } as any);
}
