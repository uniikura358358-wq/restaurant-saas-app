import { NextRequest, NextResponse } from 'next/server';
import { getGenerativeModel } from "@/lib/vertex-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, backgroundImage, productName, price, description, catchphrase, planName = 'pro' } = body;

        if (!image) {
            return NextResponse.json({ error: '商品画像が必要です' }, { status: 400 });
        }

        // Base64解析
        const productBase64 = image.split(',')[1] || image;
        const productMime = image.split(';')[0].split(':')[1] || 'image/png';

        const bgBase64 = backgroundImage ? (backgroundImage.split(',')[1] || backgroundImage) : null;
        const bgMime = backgroundImage ? (backgroundImage.split(';')[0].split(':')[1] || 'image/png') : null;

        const { getPlanAiPolicy } = await import("@/lib/vertex-ai");
        const planPolicy = getPlanAiPolicy(planName);
        const model = getGenerativeModel(planPolicy.primary);

        const prompt = `
あなたはプロのグラフィックデザイナーです。
アップロードされた「商品写真」と、もしあれば「背景テンプレート画像」を解析して、最高品質のPOP/メニューレイアウトを提案してください。

【制約事項】
1. 背景テンプレートがある場合：そのデザイン（枠や空きスペース）を活かし、商品写真をどこに配置すべきか（productLayout）、テキストをどこに置くべきかを決めてください。
2. 背景テンプレートがない場合：商品写真自体を背景として、その上の空きスペースにテキストを配置してください。
3. 座標(x, y)は0〜100のパーセンテージ。
4. 出力は以下のJSON形式のみ。

{
  "styleType": "japanese" | "western" | "modern" | "casual",
  "recommendedColor": "hex_color",
  "recommendedBgColor": "hex_color (背景がない場合の推奨背景色)",
  "productLayout": { "x": number, "y": number, "scale": number, "zIndex": number },
  "layout": {
    "productName": { "x": number, "y": number, "fontSize": number, "align": "left" | "center" | "right" },
    "price": { "x": number, "y": number, "fontSize": number, "align": "left" | "center" | "right" },
    "catchphrase": { "x": number, "y": number, "fontSize": number, "align": "left" | "center" | "right" },
    "description": { "x": number, "y": number, "fontSize": number, "align": "left" | "center" | "right" }
  },
  "suggestedFontId": "font-noto-serif" | "font-noto-sans" | "font-yuji" | "font-inter" | "font-playfair" | "font-bebas"
}
`;

        const parts: any[] = [{ text: prompt }];

        // 商品写真を追加
        parts.push({
            inlineData: {
                data: productBase64,
                mimeType: productMime
            }
        });

        // 背景テンプレートがあれば追加
        if (bgBase64 && bgMime) {
            parts.push({
                inlineData: {
                    data: bgBase64,
                    mimeType: bgMime
                }
            });
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });

        const response = await result.response;
        let text = "";
        try {
            text = response.text();
        } catch (e) {
            // response.candidates[0].content.parts[0].text のような構造を想定したフォールバック
            const candidates = (response as any).candidates;
            if (candidates && candidates[0]?.content?.parts[0]?.text) {
                text = candidates[0].content.parts[0].text;
            } else {
                throw new Error("AIからのテキスト応答を取得できませんでした");
            }
        }

        // JSONの抽出 (markdownのコードブロックを削除)
        text = text.replace(/```json\n?/, '').replace(/```\n?/, '').trim();

        try {
            const layoutData = JSON.parse(text);
            return NextResponse.json(layoutData);
        } catch (e) {
            console.error('Failed to parse AI response as JSON:', text);
            return NextResponse.json({ error: 'AIの応答を解析できませんでした', raw: text }, { status: 500 });
        }

    } catch (error: any) {
        console.error('AI Layout Analysis Error:', error);
        return NextResponse.json(
            { error: error.message || 'AI解析に失敗しました' },
            { status: 500 }
        );
    }
}
