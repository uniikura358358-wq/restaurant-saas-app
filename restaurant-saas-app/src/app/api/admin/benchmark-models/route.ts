import { getGenerativeModel } from "@/lib/vertex-ai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const scenarios = [
        {
            title: "感情混在・不手際への不満",
            content: "料理の味は素晴らしく、特にお肉の焼き加減は完璧でした。しかし、予約していたのに席に案内されるまで20分以上待たされ、その際の説明も不十分で不快な思いをしました。食後のコーヒーも忘れられていて、こちらから指摘するまで出てきませんでした。味が良いだけにもったいないです。"
        },
        {
            title: "食のこだわり・専門的要望",
            content: "素材を活かしたミニマルな調理法で、アミューズからデセールまで一貫したストーリー性を感じました。低温調理された真鯛の火入れが絶妙。ただ、ペアリングのワインがやや古典的すぎて、このモダンな料理にはもっとアグレッシブな自然派ワインをぶつけても面白かったのではないかと思います。プロフェッショナルな接客には感服しました。"
        },
        {
            title: "安全管理（アレルギー）のミス",
            content: "ナッツアレルギーを事前に伝えていたにもかかわらず、サラダにスライスアーモンドがトッピングされていました。一口食べる前に気づいたので事なきを得ましたが、一歩間違えれば大惨事でした。店長さんからは丁寧な謝罪とデザートのサービスがありましたが、キッチンの連携体制に強い不安を感じます。味は美味しいですが、命に関わることなので改善を強く求めます。"
        }
    ];

    const modelConfigs = [
        { label: "Gemini 3 Pro (High Reasoning)", id: "gemini-3-pro-preview", thinking: "HIGH" },
        { label: "Gemini 3 Flash (Sub/Fast)", id: "gemini-3-flash-preview", thinking: "LOW" },
        { label: "Gemini 2.5 Flash (Main/Stable)", id: "gemini-2.5-flash", thinking: null },
        { label: "Gemini 2.0 Flash (New/Fast)", id: "gemini-2.0-flash", thinking: null }
    ];

    const results: any[] = [];

    // システムプロンプト風の指示
    const systemInstruction = "あなたは高級レストランのオーナーです。お客様からの口コミに、誠実かつ洗練された日本語で返信を作成してください。各口コミのニュアンス（喜び、不満、提案、不安）を正確に汲み取り、再来店につなげるような内容を心がけてください。";

    for (const scenario of scenarios) {
        const scenarioResults: any = { scenario: scenario.title, comparisons: [] };

        for (const config of modelConfigs) {
            try {
                const model = getGenerativeModel(config.id, true);
                const start = Date.now();

                const generationConfig: any = {};
                if (config.thinking) {
                    generationConfig.thinking_config = {
                        include_thoughts: false,
                        thinking_level: config.thinking
                    };
                }

                const response = await model.generateContent({
                    contents: [
                        { role: 'user', parts: [{ text: `${systemInstruction}\n\n口コミ:\n${scenario.content}` }] }
                    ],
                    generationConfig
                });

                const end = Date.now();
                const text = response.response.candidates?.[0]?.content?.parts?.[0]?.text || "";

                scenarioResults.comparisons.push({
                    model: config.label,
                    response: text.trim(),
                    time: `${end - start}ms`
                });
            } catch (error: any) {
                scenarioResults.comparisons.push({
                    model: config.label,
                    error: error.message
                });
            }
        }
        results.push(scenarioResults);
    }

    return NextResponse.json({ results });
}
