import { NextRequest, NextResponse } from 'next/server';
import { getGenerativeModel } from "@/lib/vertex-ai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { backgroundImage, planName = 'pro' } = body;

        if (!backgroundImage) {
            return NextResponse.json({ error: 'テンプレート画像が必要です' }, { status: 400 });
        }

        // Base64解析
        const bgBase64 = backgroundImage.split(',')[1] || backgroundImage;
        const bgMime = backgroundImage.split(';')[0].split(':')[1] || 'image/png';

        const { getPlanAiPolicy } = await import("@/lib/vertex-ai");
        const planPolicy = getPlanAiPolicy(planName);
        const model = getGenerativeModel(planPolicy.primary);

        const prompt = `
あなたはプロのレイアウト解析アシスタントです。
アップロードされたメニューやチラシの「テンプレート画像」を解析し、料理などの「商品写真」を入れるための枠（プレースホルダー）や空きスペースをすべて検出してください。

【出力要件】
1. 写真を入れるべき場所の中心座標(x, y)とサイズ(scale)を推測してください。
2. 座標(x, y)およびスケール(scale)は、0〜100のパーセンテージ。
3. 枠が複数ある場合はすべてリストアップしてください。
4. 出力は以下のJSON形式のみ。テキストによる説明は一切不要です。

{
  "photoAreas": [
    { "x": number, "y": number, "scale": number, "zIndex": number },
    ...
  ],
  "detectedStyle": "modern" | "classic" | "casual" | "japanese"
}
`;

        const parts: any[] = [
            { text: prompt },
            {
                inlineData: {
                    data: bgBase64,
                    mimeType: bgMime
                }
            }
        ];

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });

        let text = "";
        try {
            // Vertex AI SDKのレスポンス構造に合わせる
            const resultText = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (resultText) {
                text = resultText;
            } else {
                throw new Error("AIからのテキスト応答が空です");
            }
            console.log('AI Raw Response:', text);
        } catch (e) {
            console.error('Failed to get response text:', e);
            // フォールバック
            const candidates = (result.response as any).candidates;
            if (candidates && candidates[0]?.content?.parts[0]?.text) {
                text = candidates[0].content.parts[0].text;
                console.log('AI Raw Response (from fallback):', text);
            } else {
                console.error('Full AI Response Object:', JSON.stringify(result.response, null, 2));
                throw new Error("AIからの応答を取得できませんでした");
            }
        }

        // JSONの抽出 (markdownのコードブロックを削除)
        text = text.replace(/```json\n?/, '').replace(/```\n?/, '').replace(/`/g, '').trim();

        // 稀にJSONの一部だけが返ってくる場合や、前後に余計な文字がある場合への対応
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0];
        }

        try {
            const data = JSON.parse(text);
            console.log('Parsed Template Data:', data);
            return NextResponse.json(data);
        } catch (e) {
            console.error('Failed to parse AI response as JSON:', text, e);
            return NextResponse.json({ error: 'AIの解析結果を読み取れませんでした', raw: text }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Template Analysis Error:', error);
        return NextResponse.json(
            { error: error.message || 'テンプレート解析に失敗しました' },
            { status: 500 }
        );
    }
}
