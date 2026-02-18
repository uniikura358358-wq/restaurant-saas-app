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
  let emojiInstructions = [
    "絵文字は一切使用しないでください。",
    "文末に1つか2つ、控えめに絵文字を使用してください。",
    "丁寧な文章の中にも、必ず3〜5個程度の絵文字（😊, ✨, 🍽️など）を交ぜて、親しみやすさを演出してください。",
    "絵文字（😍, 🎉, 💖, 🌈など）を多用（6個以上）し、非常に明るく華やかで感情豊かな文章にしてください。"
  ][config.emoji_level] || "";

  // 1-2星（低評価）の場合は強制的に絵文字を抑える
  if (starRating <= 2) {
    emojiInstructions = "お客様を不快にさせないよう、絵文字は一切使わないか、使う場合も文末に1〜2個程度、謝罪や深い反省を表す記号（🙇‍♂️ や 🙇 など）に限定してください。表現スタイル（普通、多め）の設定に関わらず、合計2つ以内を厳守してください。キラキラした絵文字や派手な装飾は厳禁です。";
  }

  // 3. トーンの指示
  const toneInstructions: Record<string, string> = {
    polite: "誠実で丁寧なビジネス敬語を使用してください。過度な装飾を避け、信頼感を重視します。",
    friendly: "親しみやすく、温かみのある言葉遣いにしてください。お客様との距離を縮めるような表現を好みます。",
    energetic: "活気があり、元気な印象を与えてください。感嘆符（！）を適度に使用し、再来店を強く促してください。"
  };

  // 4. プロンプトの合成（指示の密度を高め、トークンを節約）
  return `あなたは飲食店「${config.store_name}」のオーナーです。
以下の口コミに対し、返信の核となる文章を基に指定の条件で作成してください。

# 条件:
- 語口: ${toneInstructions[config.ai_tone] || toneInstructions.polite}
- 絵文字: ${emojiInstructions}
- 署名: 文末に「${config.default_signature || "店長"}」
- 禁止: 存在しないメニューや割引への言及は厳禁。
- 形式: 口コミ具体性に触れつつ、簡潔〜適宜（最大300文字以内）にまとめ、返信本文のみ出力せよ。

# 返信の核となる文章:
${baseText}

# お客様の口コミ:
"${reviewText}"`.trim();
}
