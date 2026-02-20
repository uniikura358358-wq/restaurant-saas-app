import { NextRequest, NextResponse } from "next/server";
import { getGenerativeModel } from "@/lib/vertex-ai";
import { verifyAuth } from "@/lib/auth-utils";

export async function POST(req: NextRequest) {
    try {
        const { uid } = await verifyAuth(req);
        if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

        // Vertex AI (Gemini) を呼び出し
        const model = getGenerativeModel("gemini-3-flash-preview");

        const prompt = `
納品書または領収書の画像を解析し、以下の情報をJSON形式で抽出してください。
抽出できない項目はnullにしてください。

- merchant_name: 発行元（店名・会社名）
- total_amount: 合計金額（数値のみ）
- transaction_date: 取引日（YYYY-MM-DD形式）
- category: 以下のいずれか (仕入, 消耗品, 光熱費, 賃料, その他)
- invoice_number: インボイス登録番号（T+13桁の数値等、あれば）
- tax_amount: 消費税額（あれば）

レスポンスは純粋なJSONのみを返してください。markdownの装飾（\`\`\`jsonなど）は不要です。
`;

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
        });

        const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

        // JSONのクリーンアップ（もしモデルが装飾を付けてしまった場合用）
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

        const extractedData = JSON.parse(cleanJson);

        return NextResponse.json({ result: extractedData });

    } catch (error: any) {
        console.error("OCR Analysis Error:", error);
        return NextResponse.json({ error: error.message || "Failed to analyze document" }, { status: 500 });
    }
}
