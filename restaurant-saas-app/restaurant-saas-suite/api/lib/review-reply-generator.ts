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

  function getEmojiInstruction(emojiLevel: number): string {
    if (emojiLevel <= 0) return "絵文字は一切使わないでください。";

    if (emojiLevel === 1) {
      return "【控えめモード】絵文字は1〜3個程度。主に文末に1つずつ、😊 や ✨ などの定番を添える程度にし、誠実さを保ちつつ僅かな温かみを添えてください。";
    }

    if (emojiLevel === 2) {
      return "【普通モード】絵文字は4〜9個程度。文章の区切りや文末にリズムよく配置してください。店舗のジャンルに合わせた絵文字（🍜, 🍕, ☕, 🍶等）や、感情（😋, 👍, 🌈）を交ぜ、テンプレート感のない生き生きとした文章にしてください。";
    }

    // 多め：圧倒的な活気
    return "【多めモード】絵文字を10個以上、積極的に使用してください。文中・文末だけでなく、重要な言葉を絵文字で挟んだり（例：✨感謝✨）、複数の絵文字を繋げて装飾したり（例：🎉🎊🥂）して、圧倒的な喜びと活気を表現してください。読者が「ここに行けば元気になれる！」と感じるような、最高に明るく華やかな文章にしてください。";
  }
  let emojiInstructions = getEmojiInstruction(config.emoji_level);


  // 3. トーンの指示
  const toneInstructions: Record<string, string> = {
    polite: "誠実で丁寧なビジネス敬語を使用してください。過度な装飾を避け、信頼感を重視します。",
    friendly: "親しみやすく、温かみのある言葉遣いにしてください。お客様との距離を縮めるような表現を好みます。",
    energetic: "活気があり、元気な印象を与えてください。感嘆符（！）を適度に使用し、再来店を強く促してください。"
  };

  // 4. プロンプトの合成（Google審査基準と飲食店マナーに基づく高度化）
  return `あなたは飲食店「${config.store_name}」の責任者です。Googleマップの口コミに対し、誠実さとプロ意識を感じさせる返信を作成してください。

# ミッション:
お客様の体験に深く寄り添い、再来店したくなる「おもてなしの心」を文章で表現すること。

# 返信の構成（マナー重視）:
1. 【感謝】ご来店と貴重な投稿（良い点への言及）に対する心からの御礼。
2. 【共感・謝罪】不満点がある場合は、言い訳をせず真摯に受け止め、改善の姿勢を示す。
3. 【個別対応】口コミに含まれる具体的な内容（料理名、接客、雰囲気など）を反映し、テンプレート感を出さない。
4. 【再来店の促進】次回の来店を心待ちにしていることを伝え、温かく締めくくる。

# 制約条件（Googleコンプライアンス）:
- 語口: ${toneInstructions[config.ai_tone] || toneInstructions.polite}
- 絵文字: ${emojiInstructions}
- 署名: 文末に「${config.default_signature || "店主"}」を含めること。
- 禁止事項: 
    - 虚偽の事実、存在しない割引・キャンペーンへの言及。
    - 医療的な効果効能（「健康になる」等）や宗教的・政治的発言。
    - 攻撃的な言葉遣いやお客様への反論。
- 形式: 返信本文のみを出力し、解説やメタ発言（「以下に作成しました」等）は一切含めないこと。最大300文字以内。

# 参考となるベース文章:
${baseText}

# お客様の口コミ:
"${reviewText}"`.trim();
}
