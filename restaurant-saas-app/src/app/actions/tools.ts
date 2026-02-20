"use server";
import { getGenerativeModel } from "@/lib/vertex-ai";

/**
 * AIによるPOP用コピー生成 (Vertex AI版)
 * 運用規則に基づき、安定した 2.5-flash モデルをメインで使用します。
 */
export async function generatePopCopy(data: {
    productName: string;
    category: string;
    price: string;
    features: string;
    style: string;
}) {
    const model = getGenerativeModel("gemini-2.5-flash");

    const prompt = `
あなたはプロの飲食コンサルタント兼コピーライターです。
飲食店のテーブルPOPやメニューに載せる「魅力的なキャプション」を作成してください。

【商品情報】
商品名: ${data.productName}
カテゴリ: ${data.category}
価格: ${data.price}
特徴: ${data.features}
デザインスタイル: ${data.style}

【出力内容】
1. キャッチコピー (15文字以内、インパクト重視)
2. 紹介文 (80文字以内、シズル感を重視し、注文したくなる文章)

返信は以下のJSON形式のみで返してください。余計な解説は不要です。
{
  "catchphrase": "...",
  "description": "..."
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = (result as any).response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error("Invalid format from AI");
    } catch (error) {
        console.error("AI Generation Error (Vertex AI):", error);
        return {
            catchphrase: "新登場の逸品",
            description: `${data.productName}。厳選素材を使用した店長自信の味をぜひ。`,
        };
    }
}
