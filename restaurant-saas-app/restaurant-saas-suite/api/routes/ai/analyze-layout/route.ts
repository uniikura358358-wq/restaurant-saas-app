import { NextRequest, NextResponse } from 'next/server';
import { getPlanAiPolicy, getGenerativeModel } from "@/lib/vertex-ai";

import { verifyAuth } from "@/lib/auth-utils";
import { enforceSubscriptionLock } from "@/lib/subscription-server";

export const maxDuration = 60; // タイムアウト延長

export async function POST(req: NextRequest) {
    try {
        const user = await verifyAuth(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        await enforceSubscriptionLock(user.uid, "ai_api");

        const {
            image,
            backgroundImage,
            productName,
            price,
            description,
            catchphrase,
            planName,
            aiScenario
        } = await req.json();

        // プランに基づいたモデル設定の取得
        const { primary, primaryNeedsThinking } = getPlanAiPolicy(planName || '');
        const model = getGenerativeModel(primary);

        // システムプロンプトの構築
        let systemPrompt = `
あなたはプロのPOPデザイナーです。
ユーザーから提供された情報（商品名、価格、説明、画像など）を元に、最適なレイアウトとデザインをJSON形式で提案してください。
JSON形式以外の出力は禁止です。

【入力情報】
- 商品名: ${productName || "未設定"}
- 価格: ${price || "未設定"}
- キャッチコピー: ${catchphrase || "未設定"}
- 説明文: ${description || "未設定"}
- 画像URL: ${image ? "あり" : "なし"}
- 背景画像URL: ${backgroundImage ? "あり" : "なし"}
- シナリオ: ${aiScenario || "standard"}

【出力JSONスキーマ】
{
  "productName": { "top": "...", "left": "...", "align": "center", "color": "#000", "fontSize": 3 },
  "price": { "top": "...", "left": "...", "align": "center", "color": "#f00", "fontSize": 4 },
  "catchphrase": { "top": "...", "left": "...", "align": "center", "color": "#000", "fontSize": 3 },
  "description": { "top": "...", "left": "...", "align": "center", "color": "#333", "fontSize": 2 },
  "recommendedColor": "#000",
  "recommendedBgColor": "#fff",
  "backgroundPrompt": "..." (ナノバナナ画像生成用プロンプト。英語で記述)
}

【デザインの指針】
- 視認性を最優先してください。
- 画像がある場合は、画像に被らないように文字を配置するか、可読性を確保するための工夫（袋文字、背景色など）を提案してください。
- 高級感のあるデザイン、ポップなデザインなど、シナリオや商品内容から最適な雰囲気を推測してください。

【背景画像生成(backgroundPrompt)の重要指示】
- 背景画像の中に文字（商品名、価格、宣伝文句など）を絶対に含まないでください ("no text", "no words", "no letters" をプロンプトに含めること)。背景はあくまでデザインの土台です。
- テキストを配置するための十分な余白（Copy Space / Blank Space）を確保した構図を提案してください。
- 料理などのメインの被写体がある場合は、それを画面の端（左寄せ、右寄せ、下寄せなど）に配置し、中央や反対側に大きな空間を作るように指示してください。
- POPの雰囲気に合わせた、高品質かつ抽象的な要素を含む背景を指示してください。
`;

        if (aiScenario === 'menu') {
            systemPrompt += `
\n【メニュー表作成の追加指針】
- 複数の商品が見やすく並ぶようにレイアウトしてください。
- カテゴリ分けが必要な場合は、見出しを適切に配置してください。
`;
        } else if (aiScenario === 'poster') {
            systemPrompt += `
\n【ポスター作成の追加指針】
- 遠くからでも目を引くインパクトのあるレイアウトにしてください。
- キャッチコピーを大きく配置し、詳細情報は下部にまとめてください。
`;
        }

        // AI生成の実行
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });

        const response = (result as any).response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // JSONの抽出とパース
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("AIからの応答が正しいJSON形式ではありませんでした。");
        }

        const layoutData = JSON.parse(jsonMatch[1] || jsonMatch[0]);

        return NextResponse.json(layoutData);

    } catch (error: any) {
        console.error("AI Layout Analysis Error:", error);
        return NextResponse.json(
            { error: error.message || "AIによるレイアウト解析に失敗しました。" },
            { status: 500 }
        );
    }
}
