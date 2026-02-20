import { NextRequest, NextResponse } from "next/server";
import { getGenerativeModel } from "@/lib/vertex-ai";
import { verifyAuth } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user || !user.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const uid = user.uid;

        // プラン取得（フォールバック: "standard"）
        let planName = "standard";
        try {
            const { getDbForUser } = await import("@/lib/firebase-admin");
            const db = await getDbForUser(uid);
            const userDoc = await db.collection("users").doc(uid).get();
            const userData = userDoc.data();
            planName = userData?.plan || userData?.planName || 'standard';
        } catch (dbError) {
            console.error("Accounting Analyze: Plan fetch failed (fallback standard):", dbError);
        }

        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // base64のヘッダーを削除
        const base64Data = image.split(',')[1];
        if (!base64Data) {
            return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
        }

        const prompt = `
納品書または領収書の画像を解析し、以下の情報をJSON形式で抽出してください。
抽出できない項目はnullにしてください。

- merchant_name: 発行元（店名・会社名）
- total_amount: 合計金額（数値のみ）
- transaction_date: 取引日（YYYY-MM-DD形式）
- category: 以下のいずれか (仕入, 消耗品, 光熱費, 賃料, その他)
- invoice_number: インボイス登録番号（T+13桁の数値等、あれば）
- tax_amount: 消費税額（あれば）

レスポンスは純粋なJSONのみを返してください。markdownの装飾(\`\`\`jsonなど）は不要です。
エラーや判別不能な場合は、{"error_message": "...", "raw_input": "..."} の形式で返してください。
`;

        // 領収書OCRはプランのメインモデルを使用
        // Standard: 2.5-flash / Pro・Pro Premium: 3-flash-preview (LOW)
        const { AI_POLICY, getPlanAiPolicy } = await import("@/lib/vertex-ai");
        const planPolicy = getPlanAiPolicy(planName);
        const targetModels = [planPolicy.primary, planPolicy.secondary];
        const thinkingFlags = [planPolicy.primaryNeedsThinking, planPolicy.secondaryNeedsThinking];
        let responseText: string | null = null;
        let lastError: any = null;

        for (const [idx, modelName] of targetModels.entries()) {
            try {
                const model = getGenerativeModel(modelName);
                // 領収書OCR用パラメータ（低温度・高再現性）
                const generationConfig: any = {
                    temperature: 0.1,
                    topP: 0.7,
                    topK: 20,
                    maxOutputTokens: 256,
                };
                if (thinkingFlags[idx]) {
                    generationConfig.thinking_config = AI_POLICY.THINKING_CONFIG_LOW.thinking_config;
                }

                const result = await model.generateContent({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        data: base64Data,
                                        mimeType: "image/jpeg",
                                    },
                                },
                            ],
                        },
                    ],
                    generationConfig,
                });

                const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) { responseText = text; break; }
            } catch (error: any) {
                console.warn(`Accounting Analyze error for ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (!responseText) {
            return NextResponse.json({ error: lastError?.message || "Failed to analyze document" }, { status: 500 });
        }

        // JSONのクリーンアップ
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

        const extractedData = JSON.parse(cleanJson);

        return NextResponse.json({ result: extractedData });

    } catch (error: any) {
        console.error("OCR Analysis Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze document" }, { status: 500 });
    }
}
