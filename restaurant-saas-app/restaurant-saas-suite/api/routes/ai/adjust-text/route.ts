import { NextRequest, NextResponse } from 'next/server';
import { getGenerativeModel } from "@/lib/vertex-ai";

import { verifyAuth } from "@/lib/auth-utils";
import { enforceSubscriptionLock } from "@/lib/subscription-server";

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        await enforceSubscriptionLock(user.uid, "ai_api");

        const body = await req.json();
        const { text, planName: requestedPlanName } = body;

        // プラン別モデルポリシー取得
        // Standard: 2.5-Flash(main) → 3-Flash-Preview(LOW)(fallback)
        // Pro/Pro Premium: 3-Flash-Preview(LOW)(main) → 2.5-Flash(fallback)
        const { AI_POLICY, getPlanAiPolicy } = await import("@/lib/vertex-ai");
        const planPolicy = getPlanAiPolicy(requestedPlanName || 'standard');
        const targetModels = [planPolicy.primary, planPolicy.secondary];
        let responseText: string | null = null;
        let lastError: any = null;

        const prompt = `以下の文章を、飲食店のキャプションとしてより魅力的で読みやすい形に調整してください。装飾文字などは控えめに、清潔感のある表現を心がけてください。\n\n原文:\n${text}`;

        for (const [idx, modelName] of targetModels.entries()) {
            const needsThinking = idx === 0 ? planPolicy.primaryNeedsThinking : planPolicy.secondaryNeedsThinking;
            try {
                const model = getGenerativeModel(modelName);
                // テキスト調整用パラメータ（クリエイティブ寄り）
                const generationConfig: any = {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 350,
                };
                if (needsThinking) {
                    generationConfig.thinking_config = AI_POLICY.THINKING_CONFIG_LOW.thinking_config;
                }

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig
                });

                const response = (result as any).response;
                responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (responseText) break;
            } catch (error: any) {
                console.warn(`Adjust Text retryable error for ${modelName}:`, error.message);
                lastError = error;
            }
        }

        if (!responseText) {
            throw lastError || new Error('調整に失敗しました');
        }

        return NextResponse.json({ result: responseText });
    } catch (error) {
        console.error('AI Adjustment Error (Vertex AI):', error);
        return NextResponse.json(
            { error: 'Failed to adjust text via Vertex AI' },
            { status: 500 }
        );
    }
}

