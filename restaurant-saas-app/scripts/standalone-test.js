
const { VertexAI } = require("@google-cloud/vertexai");
const dotenv = require("dotenv");
const path = require("path");

// .env.local を読み込み
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testVertexAIStandalone() {
    console.log("--- Vertex AI スタンドアロンテスト開始 ---");

    const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dummy-project";

    if (!serviceAccountStr) {
        console.error("❌ FIREBASE_SERVICE_ACCOUNT_KEY が .env.local に見つかりません。");
        return;
    }

    try {
        const credentials = JSON.parse(serviceAccountStr);
        const vertexAI = new VertexAI({
            project: credentials.project_id || projectId,
            location: "us-central1",
            googleAuthOptions: {
                credentials: {
                    client_email: credentials.client_email,
                    private_key: credentials.private_key,
                }
            }
        });

        const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = "今、Vertex AI Studio への移行テストをしています。飲食店オーナーへの挨拶として、短く1言コメントを返してください。";

        console.log("API 呼び出し中 (Vertex AI)...");

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "応答なし";

        console.log("\n--- AIからのレスポンス ---");
        console.log(text.trim());
        console.log("------------------------\n");
        console.log("✅ Vertex AI 疎通確認成功！");

    } catch (error) {
        console.error("\n❌ 疎通確認失敗");
        console.error("Error details:", error.message);
    }
}

testVertexAIStandalone();
