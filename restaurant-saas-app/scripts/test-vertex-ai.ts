
import { getGenerativeModel } from "./src/lib/vertex-ai";
import * as dotenv from "dotenv";
import path from "path";

// .env.local を読み込み
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testVertexAI() {
    console.log("--- Vertex AI 疎通テスト開始 ---");

    try {
        const model = getGenerativeModel("gemini-1.5-flash");
        const prompt = "今、Vertex AI Studio への移行テストをしています。飲食店オーナーへの挨拶として、短く1言コメントを返してください。";

        console.log("Prompt:", prompt);
        console.log("API 呼び出し中...");

        const result = await model.generateContent(prompt);
        const response = (result as any).response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "応答なし";

        console.log("\n--- AIからのレスポンス ---");
        console.log(text.trim());
        console.log("------------------------\n");
        console.log("✅ 疎通確認成功！");

    } catch (error: any) {
        console.error("\n❌ 疎通確認失敗");
        console.error("Error details:", error.message);
        if (error.stack) {
            // 認証エラーなどの詳細を確認
            if (error.message.includes("403") || error.message.includes("Permission")) {
                console.error("💡 ヒント: Google Cloud コンソールで Vertex AI API が有効か、IAM 権限が正しいか確認してください。");
            }
        }
    }
}

testVertexAI();
