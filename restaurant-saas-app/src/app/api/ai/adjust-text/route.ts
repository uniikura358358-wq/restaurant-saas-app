import { NextRequest, NextResponse } from 'next/server';
import { getGenerativeModel } from "@/lib/vertex-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, model: requestedModel } = body;

        const modelName = requestedModel || 'gemini-2.5-flash';
        console.log(`[AI Adjust] Using Vertex AI model: ${modelName}, Input: ${text}`);

        const model = getGenerativeModel(modelName);
        const prompt = `以下の文章を、飲食店のキャプションとしてより魅力的で読みやすい形に調整してください。装飾文字などは控えめに、清潔感のある表現を心がけてください。\n\n原文:\n${text}`;

        const result = await model.generateContent(prompt);
        const response = (result as any).response;
        const adjustedText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        return NextResponse.json({ result: adjustedText });
    } catch (error) {
        console.error('AI Adjustment Error (Vertex AI):', error);
        return NextResponse.json(
            { error: 'Failed to adjust text via Vertex AI' },
            { status: 500 }
        );
    }
}
