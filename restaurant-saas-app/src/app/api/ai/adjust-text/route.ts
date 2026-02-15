
import { NextRequest, NextResponse } from 'next/server';

// Mock function to simulate Gemini API call since the model name is specific/placeholder
async function callGeminiAPI(prompt: string, model: string) {
    // In a real implementation:
    // const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    // const model = genAI.getGenerativeModel({ model: modelName });
    // ...

    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    return "【極上の一杯】こだわりの自家製麺と、創業以来継ぎ足された秘伝のスープ。心まで温まる至福のひとときをお楽しみください。";
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { text, model } = body;

        console.log(`[AI Adjust] Using model: ${model}, Input: ${text}`);

        // Mock response for "gemini-3-flash-preview" as requested
        const result = await callGeminiAPI(text, model || 'gemini-3-flash-preview');

        return NextResponse.json({ result });
    } catch (error) {
        console.error('AI Adjustment Error:', error);
        return NextResponse.json(
            { error: 'Failed to adjust text' },
            { status: 500 }
        );
    }
}
