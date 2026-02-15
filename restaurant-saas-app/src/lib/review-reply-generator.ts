// src/lib/review-reply-generator.ts
import { ToneConfigData } from "@/app/settings/store/page";

/** AI生成の入力データ型 */
export interface GenerateReplyParams {
  reviewText: string;
  starRating: number;
  customerName?: string;
  config: ToneConfigData;
}

/**
 * AI返信文を生成するためのプロンプト（指示書）を構築する
 */
export function buildGeneratorPrompt(params: GenerateReplyParams): string {
  const { reviewText, starRating, customerName = "お客様", config } = params;

  // 1. テンプレートの選択と変数置換
  const template = config.reply_templates[String(starRating)] || { title: "", body: "" };
  let baseText = template.body;
  baseText = baseText.replace(/{お客様名}/g, customerName);
  baseText = baseText.replace(/{店舗名}/g, config.store_name);
  baseText = baseText.replace(/{評価}/g, "★".repeat(starRating));

  // 2. 絵文字レベルの指示
  const emojiInstructions = [
    "絵文字は一切使用しないでください。",
    "文末に1つか2つ、控えめに絵文字を使用してください。",
    "文章の途中で適度に絵文字（😊, ✨, 🍽️など）を3〜5個程度使用し、親しみやすさを出してください。",
    "絵文字（😍, 🎉, 💖, 🌈など）を多用（6個以上）し、非常に明るく華やかで感情豊かな文章にしてください。"
  ][config.emoji_level] || "";

  // 3. トーンの指示
  const toneInstructions: Record<string, string> = {
    polite: "誠実で丁寧なビジネス敬語を使用してください。過度な装飾を避け、信頼感を重視します。",
    friendly: "親しみやすく、温かみのある言葉遣いにしてください。お客様との距離を縮めるような表現を好みます。",
    energetic: "活気があり、元気な印象を与えてください。感嘆符（！）を適度に使用し、再来店を強く促してください。"
  };

  // 4. プロンプトの合成（指示の優先順位を考慮）
  return `
あなたは飲食店「${config.store_name}」のオーナーです。
以下の「お客様からの口コミ」に対して、提供された「返信の核となる文章」をベースに、指定された「トーン」と「絵文字レベル」で返信文を作成してください。

# 制約事項:
- 文章トーン: ${toneInstructions[config.ai_tone] || toneInstructions.polite}
- 絵文字ルール: ${emojiInstructions}
- 署名: 文末に必ず「${config.default_signature}」を含めてください。
- 禁止事項: 嘘（提供していないサービス、割引など）を勝手に書かないでください。
- 構造: テンプレートの文章をベースに、指定された絵文字レベルに応じて**絵文字を適宜挿入・装飾**しながら、口コミの内容に具体的に触れて感謝や改善を伝えてください。

# 返信の核となる文章 (テンプレート):
${baseText}

# お客様からの口コミ:
"${reviewText}"

# 出力形式:
返信本文のみを出力してください。
  `.trim();
}
