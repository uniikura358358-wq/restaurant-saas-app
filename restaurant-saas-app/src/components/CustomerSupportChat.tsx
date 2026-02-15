'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';



// Scenario Steps
type ScenarioStep = {
    id: string;
    botMessage: string;
    options: { label: string; nextStep: string; action?: string }[];
};

// 混雑状況フラグ（ここをtrueにすると全ユーザーに長めの納期を案内します）
const IS_BUSY_MODE = false;

const SCENARIO: Record<string, ScenarioStep> = {
    start: {
        id: 'start',
        botMessage: 'こんにちは！AIサポートアシスタントです。本日はどのようなご用件でしょうか？',
        options: [
            { label: 'HP制作について相談したい', nextStep: 'hp_intro' },
            { label: '料金や機能について詳しく', nextStep: 'faq_pricing_menu' },
            { label: 'その他', nextStep: 'other' }
        ]
    },
    // HP Production Scenario (Polite Version)
    hp_intro: {
        id: 'hp_intro',
        botMessage: 'HP制作のご相談ですね、ありがとうございます。より良いご提案のために、いくつか簡単な質問をさせてください。\nまず、お店の雰囲気を伝えるための【店内画像】はお手元にご用意ございますでしょうか？',
        options: [
            { label: 'はい、用意できます', nextStep: 'hp_menu' },
            { label: 'これから撮影します', nextStep: 'hp_menu_advice' },
            { label: 'プロに撮影を依頼したい', nextStep: 'hp_photo_req' }
        ]
    },
    hp_menu_advice: {
        id: 'hp_menu_advice',
        botMessage: 'かしこまりました。最近のスマートフォンは非常に性能が良いので、**スクエア（正方形）モード** で撮影していただければ十分素敵な写真が撮れますよ。\n\n「HPだと余白が出るのでは？」とご心配されるかもしれませんが、正方形の写真が映える **スタイリッシュなカード型レイアウト** を採用しますので、余白や違和感は全く出ません。ご安心ください！\n\n続いてお伺いします。お店のイチオシとなる【売りのメニュー（1〜3商品）】はお決まりでしょうか？\n※基本は3つ商品の見本HPですが、**1つや2つの場合でも柔軟にレイアウトを調整**して作成しますので、無理に3つ揃えなくても大丈夫です！',
        options: [
            { label: 'はい、決まっています', nextStep: 'hp_menu_photo' },
            { label: 'まだ迷っています', nextStep: 'hp_menu_consult' },
            { label: '相談して決めたい', nextStep: 'hp_menu_consult' }
        ]
    },
    hp_photo_req: {
        id: 'hp_photo_req',
        botMessage: 'プロによる撮影も手配可能です（別途オプションとなります）。プロの写真は、お店の魅力を最大限に引き出してくれますのでおすすめです！\n\n「HPのレイアウトはどうなるの？」という点も、正方形・横長どちらでも美しく見えるようプロが調整しますのでご安心ください。\n\n続いてお伺いします。お店のイチオシとなる【売りのメニュー（1〜3商品）】はお決まりでしょうか？\n※基本は3つ商品の見本HPですが、**1つや2つの場合でも柔軟にレイアウトを調整**して作成しますので、無理に3つ揃えなくても大丈夫です！',
        options: [
            { label: 'はい、決まっています', nextStep: 'hp_menu_photo' },
            { label: 'まだ迷っています', nextStep: 'hp_menu_consult' },
            { label: '相談して決めたい', nextStep: 'hp_menu_consult' }
        ]
    },
    hp_menu: {
        id: 'hp_menu',
        botMessage: 'ありがとうございます。やはり実際の写真があると、お客様にお店の魅力が伝わりやすくなりますね！\n\n※メニュー写真は **正方形（1:1、推奨1080×1080px）** がおすすめです。\n「HPだと変な余白が出るんじゃ？」と思われるかもしれませんが、**正方形が綺麗にハマる専用レイアウト** で制作しますので、全く問題ありません！\n\n続いてお伺いします。お店のイチオシとなる【売りのメニュー（1〜3商品）】はお決まりでしょうか？\n※基本は3つ商品の見本HPですが、もし1つや2つの場合でも **柔軟にデザインを調整** して違和感なく仕上げます！',
        options: [
            { label: 'はい、決まっています', nextStep: 'hp_menu_photo' },
            { label: 'まだ迷っています', nextStep: 'hp_menu_consult' },
            { label: '相談して決めたい', nextStep: 'hp_menu_consult' }
        ]
    },
    hp_menu_photo: {
        id: 'hp_menu_photo',
        botMessage: '3商品がお決まりなんですね、素晴らしいです！\nちなみに、その【3商品の写真画像】もお手元にご用意できそうでしょうか？',
        options: [
            { label: 'はい、用意できます', nextStep: 'hp_details' },
            { label: '撮影はこれからです', nextStep: 'hp_details_advice' },
            { label: '写真がないのですが...', nextStep: 'hp_proposal_temp_image' }
        ]
    },
    hp_menu_consult: {
        id: 'hp_menu_consult',
        botMessage: 'かしこまりました。ぜひ一緒に考えさせてください。人気メニューや、利益率の高いメニューを選ぶのが一般的におすすめです。\n\n仮にメニューが決まったとして、【商品の写真画像】のご用意はできそうでしょうか？',
        options: [
            { label: '用意できます', nextStep: 'hp_details' },
            { label: '撮影が必要です', nextStep: 'hp_details_advice' },
            { label: '難しいかもしれません', nextStep: 'hp_proposal_temp_image' }
        ]
    },
    // New Proposal Step for fast track (Product Images substitute)
    hp_proposal_temp_image: {
        id: 'hp_proposal_temp_image',
        botMessage: '写真がすぐになくても大丈夫です！商品写真は無理にAIを使わず、\n**「文字だけで魅せるスタイリッシュなメニュー表」** や **「準備中アイコン」** で代用して作成します。\n\nこれなら違和感なく **最短3〜7日** でHPを公開できます！写真は後からスマホで撮って差し替えるだけでOKです。',
        options: [
            { label: 'それなら早くできそう！', nextStep: 'hp_details_fast_track' },
            { label: '写真は自分で用意したい', nextStep: 'hp_details_wait' }
        ]
    },
    hp_details: {
        id: 'hp_details',
        botMessage: 'お写真の準備も問題なさそうですね！安心いたしました。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】についてお伺いします。これらがまとまった資料などはございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップの情報と同じでOK', nextStep: 'hp_closing_gmap' },
            { label: 'これからまとめます', nextStep: 'hp_closing_prep' }
        ]
    },
    hp_details_fast_track: {
        id: 'hp_details_fast_track',
        botMessage: 'ありがとうございます！では仮の形式でスピーディーに進めますね。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】はお手元にございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップの情報と同じでOK', nextStep: 'hp_closing_gmap' },
            { label: 'これからまとめます', nextStep: 'hp_closing_prep' }
        ]
    },
    hp_details_wait: {
        id: 'hp_details_wait',
        botMessage: '承知いたしました。こだわりの写真で作りたい場合は、素材が揃ってからの着手となります。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】はお手元にございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップの情報と同じでOK', nextStep: 'hp_closing_gmap' },
            { label: 'これからまとめます', nextStep: 'hp_closing_prep' }
        ]
    },
    hp_details_advice: {
        id: 'hp_details_advice',
        botMessage: '承知いたしました。美味しそうな写真は集客の要ですので、ぜひ撮影にチャレンジしてみてください！\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】についてお伺いします。これらがまとまった資料などはございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップの情報と同じでOK', nextStep: 'hp_closing_gmap' },
            { label: 'これからまとめます', nextStep: 'hp_closing_prep' }
        ]
    },
    hp_details_no_photo: {
        id: 'hp_details_no_photo',
        botMessage: '写真がない場合でも、テキストの魅力だけでお客様を惹きつけるデザインをご提案できますので、どうぞご安心ください。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】はお分かりになりますでしょうか？',
        options: [
            { label: 'はい、大丈夫です', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップの情報と同じでOK', nextStep: 'hp_closing_gmap' },
            { label: '確認しておきます', nextStep: 'hp_closing_prep' }
        ]
    },
    // New Step: Reassurance for preparing later
    hp_closing_prep: {
        id: 'hp_closing_prep',
        botMessage: '承知いたしました！お忙しい中ありがとうございます。素材はご契約後の【専用管理画面】から、いつでも少しずつ登録・更新が可能です。\n\nまずは枠だけ確保しておき、準備ができた段階で制作スタートという形も取れますのでご安心ください。\n\n現時点での目安納期をお伝えしてもよろしいでしょうか？',
        options: [
            { label: 'はい、納期を知りたい', nextStep: 'hp_closing_dynamic' }
        ]
    },
    // Dynamic Outcomes
    hp_closing_a: { // 最短 (3-7 days)
        id: 'hp_closing_a',
        botMessage: 'ご確認ありがとうございます。現在の予約状況でしたら、\n**最短3〜7日間** で納品可能です！\n\nこれならすぐに集客を開始できますね。',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_b: { // 標準 (7-14 days)
        id: 'hp_closing_b',
        botMessage: 'ご確認ありがとうございます。撮影やメニュー決めを含めても、\n**7日〜14日間程度** で納品可能です。\n\n焦らずしっかり準備して、最高のお店を作りましょう！',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_c: { // じっくり (14-30 days) - Only used when BUSY or Explicitly slow
        id: 'hp_closing_c',
        botMessage: 'ご確認ありがとうございます。現在非常に多くのご依頼をいただいている関係で、\n**14日間〜30日間程度** の制作期間をいただいております。\n\nその分、一つ一つ丁寧に仕上げさせていただきます！',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    // Pre-closing Confirmation
    hp_closing_confirm: { // Fallback / unused but kept for safety logic routing
        id: 'hp_closing_confirm',
        botMessage: 'ご確認ありがとうございます。必要な情報はすべて揃っているようですね！\nこれなら制作もスムーズに進みます。',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_gmap: {
        id: 'hp_closing_gmap',
        botMessage: 'Googleマップの情報をそのまま使わせていただいて良いとのこと、ありがとうございます！手間が省ける分、少し早く着手できそうです。\n今の状況なら **最短3〜7日間** で納品できます。',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_later: {
        id: 'hp_closing_later',
        botMessage: 'かしこまりました！情報が整い次第、いつでもご連絡いただければと思います。\nまずは、概算の料金や今後の流れだけ先にお伝えすることも可能です。',
        options: [
            { label: '料金について聞きたい', nextStep: 'hp_price_explanation' },
            { label: 'また後で来ます', nextStep: 'end_later' }
        ]
    },
    // Detailed Pricing Explanation
    hp_price_explanation: {
        id: 'hp_price_explanation',
        botMessage: '料金の詳細です。\n\n【Lightプラン】\n◆ HP制作費（初回のみ）： **39,800円**\n◆ 月々の維持管理費： **2,480円**\n\n**【セルフ更新がお得です！】**\n専用の管理画面からスマホでサクッと画像を差し替えるだけで、**追加費用0円・即時反映** で更新いただけます。\n※AIによる文章作成には標準枠（月間20〜30回程度の更新目安）がありますが、万が一足りなくなった場合も **1,000円の追加枠（25〜30回程度の更新目安）** で、上限を気にせず継続利用が可能です！（※追加分は当月末または30日周期でのリセットとなります）\n\n※弊社への作業代行（月額10,000円追加/納期1〜2週間）も承っておりますが、操作はとても簡単ですのでセルフ更新を強くおすすめしております！',
        options: [
            { label: 'なるほど、わかりました', nextStep: 'hp_final_check' }
        ]
    },
    hp_final_check: {
        id: 'hp_final_check',
        botMessage: '最後までお話を聞いてくださりありがとうございます。\nご契約後は、**専用の素材管理画面** からいつでも写真や情報をアップロード・更新できます。\n\nそれでは、このままご契約のお手続きに進んでもよろしいでしょうか？',
        options: [
            { label: 'はい、契約に進みます', nextStep: 'action_payment' },
            { label: 'もう少し検討する', nextStep: 'end_consider' }
        ]
    },
    // Actions
    action_payment: {
        id: 'action_payment',
        botMessage: 'ありがとうございます！\nそれでは、安全な決済ページへご案内します。\n新しいウィンドウが開きますので、少々お待ちください...',
        options: []
    },
    end_consider: {
        id: 'end_consider',
        botMessage: 'もちろんです。お店の未来に関わる重要なお買い物ですので、じっくりご検討ください。\nいつでもここでお待ちしておりますので、またお気軽にお声がけくださいね！',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    end_later: {
        id: 'end_later',
        botMessage: '承知いたしました。\n準備が整いましたら、またいつでもお声がけください。\nお客様の素敵なお店作りのお手伝いができる日を、心よりお待ちしております！',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    end: {
        id: 'end',
        botMessage: '本日はご利用ありがとうございます。\n私たちは常にお客様の挑戦を応援しております。\nまた何かご不明な点があれば、いつでもお声がけください！',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    // FAQ / Pricing & Features Scenarios
    faq_pricing_menu: {
        id: 'faq_pricing_menu',
        botMessage: '料金や機能についてのご質問ですね。ありがとうございます。\n特に詳しく知りたい内容はございますか？',
        options: [
            { label: '各プランの違い・機能詳細', nextStep: 'faq_plans_select' },
            { label: '解約・契約変更のルール', nextStep: 'faq_contract' },
            { label: 'サポート体制について', nextStep: 'faq_support' },
            { label: 'スマホだけで使える？', nextStep: 'faq_device' },
            { label: '他社からの乗り換え', nextStep: 'faq_switch' },
            { label: '支払い方法の種類', nextStep: 'faq_payment_methods' },
            { label: '利用規約について', nextStep: 'faq_terms' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    faq_plans_select: {
        id: 'faq_plans_select',
        botMessage: 'どのプランについて詳しくご説明しましょうか？',
        options: [
            { label: 'Light (Google対策)', nextStep: 'faq_light' },
            { label: 'Standard (インスタ連携)', nextStep: 'faq_standard' },
            { label: 'Premium (全機能・売上UP)', nextStep: 'faq_premium' },
            { label: '全て比較したい', nextStep: 'faq_compare' }
        ]
    },
    faq_light: {
        id: 'faq_light',
        botMessage: '【Lightプラン (月額2,480円)】\n\nGoogleビジネスプロフィールの運用を効率化するプランです。\n\n**主な機能:**\n- **口コミ一元管理**: 全ての口コミをダッシュボードで確認\n- **AI自動返信**: 高度なAIが最適な返信案を1クリックで作成\n- **低評価通知**: ★1や★2がついた瞬間に通知し、炎上を防止\n\nまずは「お店の信頼性」を高めたい方に最適です！',
        options: [
            { label: '他のプランも見る', nextStep: 'faq_plans_select' },
            { label: '契約について聞きたい', nextStep: 'faq_contract' },
            { label: '十分わかりました', nextStep: 'end_faq' }
        ]
    },
    faq_standard: {
        id: 'faq_standard',
        botMessage: '【Standardプラン (月額9,800円)】\n\nLightプランに加え、Instagram集客を強化する人気プランです。\n\n**追加機能:**\n- **インスタ半自動投稿**: 面倒な投稿作業をボタン一つで完了\n- **リピーター獲得**: SNS発信を継続し、ファンを育てます\n\n「新規客」と「リピーター」の両方を獲得したい方におすすめです！',
        options: [
            { label: '他のプランも見る', nextStep: 'faq_plans_select' },
            { label: '契約について聞きたい', nextStep: 'faq_contract' },
            { label: '十分わかりました', nextStep: 'end_faq' }
        ]
    },
    faq_premium: {
        id: 'faq_premium',
        botMessage: '【Premiumプラン (月額12,800円)】\n\n全ての機能に加え、AIによる売上最大化支援がついた最上位プランです。\n\n**特別機能:**\n- **POP/メニューAI作成**: 魅力的な販促物を数秒で作成\n- **顧客分析AI**: 客層や来店傾向を分析し、経営改善を提案\n- **優先サポート**: 困った時に優先的に対応\n\n「もっと売上を伸ばしたい」という本気のオーナー様のためのプランです！',
        options: [
            { label: '他のプランも見る', nextStep: 'faq_plans_select' },
            { label: '契約について聞きたい', nextStep: 'faq_contract' },
            { label: '十分わかりました', nextStep: 'end_faq' }
        ]
    },
    faq_compare: {
        id: 'faq_compare',
        botMessage: '簡単比較させていただきます！\n\n◆ **Light (2,480円)**: Google口コミ管理のみ\n◆ **Standard (9,800円)**: ＋インスタ連携 (**迷ったらコレ！**)\n◆ **Premium (12,800円)**: ＋POP作成・分析機能\n\nまずはStandardで始めて、必要に応じて変更するのもおすすめです。',
        options: [
            { label: '詳しい機能を見る', nextStep: 'faq_plans_select' },
            { label: '契約ルールへ', nextStep: 'faq_contract' },
            { label: 'よくわかりました', nextStep: 'end_faq' }
        ]
    },
    faq_contract: {
        id: 'faq_contract',
        botMessage: 'ご契約に関するルールはこちらです。\n\n◆ **アップグレード**: いつでも即時可能です（差額のみ日割り請求）。機能はすぐに使えます。\n◆ **解約・ダウングレード**: いつでも申請可能ですが、適用は「現在の請求期間（月/年）の終了後」となります。\n\n期間縛りや違約金などは一切ございませんので、安心してお試しいただけます！',
        options: [
            { label: '機能について戻る', nextStep: 'faq_pricing_menu' },
            { label: 'プランを見に行く', nextStep: 'action_open_plans' },
            { label: '質問を終了する', nextStep: 'end_faq' }
        ]
    },
    faq_support: {
        id: 'faq_support',
        botMessage: 'サポート体制についてご説明します。\n\n基本機能の使い方は、管理画面内のガイドですぐに解決できます。\nもしご不明点があれば、**専用チャットまたはメール** でいつでもご相談いただけます。\n\nPremiumプランのお客様には、**優先サポートデスク** が対応し、経営相談も含めてより手厚くバックアップいたします！',
        options: [
            { label: '他の質問を見る', nextStep: 'faq_pricing_menu' },
            { label: '質問を終了する', nextStep: 'end_faq' }
        ]
    },
    faq_device: {
        id: 'faq_device',
        botMessage: 'デバイスについてのご質問ですね。\n\n**スマホ完全対応** ですので、パソコンをお持ちでなくても全く問題ありません！\nメニューの更新、口コミへの返信、HPの修正など、**全ての機能がスマートフォン1台で完結** します。\n\n忙しい営業の合間でも、スマホでサクッと操作できるのが最大の魅力です。',
        options: [
            { label: '他の質問を見る', nextStep: 'faq_pricing_menu' },
            { label: '質問を終了する', nextStep: 'end_faq' }
        ]
    },
    faq_switch: {
        id: 'faq_switch',
        botMessage: '他社サービスからのお乗り換えも大歓迎です！\n\n現在ホームページをお持ちの場合、そのURLを教えていただければ、**AIが情報を読み取って初期設定をサポート** することも可能です（制作時にお申し付けください）。\n\nGoogleマップの情報もそのまま引き継げますので、データ移行の手間はほとんどかかりません。スムーズに新しい環境へ移行できますよ！',
        options: [
            { label: '他の質問を見る', nextStep: 'faq_pricing_menu' },
            { label: '質問を終了する', nextStep: 'end_faq' }
        ]
    },
    faq_payment_methods: {
        id: 'faq_payment_methods',
        botMessage: 'お支払い方法についてです。\n\n**クレジットカード決済**（Visa, Mastercard, Amex, JCB等）および、**銀行振込**（専用のバーチャル口座宛）に対応しております。\n\n法人・個人のお客様問わず、どちらのお支払い方法も自由にお選びいただけます。',
        options: [
            { label: '他の質問を見る', nextStep: 'faq_pricing_menu' },
            { label: '契約について', nextStep: 'faq_contract' },
            { label: '質問を終了する', nextStep: 'end_faq' }
        ]
    },
    faq_terms: {
        id: 'faq_terms',
        botMessage: '利用規約については、お客様の店舗情報や顧客データを厳格に保護することをお約束しています。\n商用利用可能なAI生成コンテンツの著作権や、データの取り扱いについての詳細は、以下のリンク（公式サイト下部）からご確認いただけます。\n\nご不明な点があれば、サポートまでお問い合わせください。',
        options: [
            { label: 'メニューに戻る', nextStep: 'faq_pricing_menu' },
            { label: '質問を終了する', nextStep: 'end_faq' }
        ]
    },
    action_open_plans: {
        id: 'action_open_plans',
        botMessage: 'かしこまりました。料金プラン一覧ページへご案内します。\nぜひ、お店にぴったりのプランを見つけてくださいね！',
        options: [] // In prompt logic, we will redirect
    },
    end_faq: {
        id: 'end_faq',
        botMessage: 'ご質問ありがとうございます。少しでも疑問が解消されていれば幸いです。\n私たちは常にお客様の味方です。またいつでもお気兼ねなくご相談ください！',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    other: {
        id: 'other',
        botMessage: 'その他のお問い合わせですね。以下のよくある質問から選んでいただくか、直接入力もお試しいただけます。',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    }
};

type Message = {
    id: string;
    text: string;
    sender: 'bot' | 'user';
    timestamp: Date;
    options?: { label: string; nextStep: string }[];
};

export function CustomerSupportChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: SCENARIO.start.botMessage,
            sender: 'bot',
            timestamp: new Date(),
            options: SCENARIO.start.options
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [userSelections, setUserSelections] = useState<Record<string, string>>({});

    // Auto-scroll logic to handle long messages
    useEffect(() => {
        if (!scrollAreaRef.current) return;

        // If typing, always scroll to bottom to show the indicator
        if (isTyping) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
            return;
        }

        // Handle new messages
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            // We use a timeout to ensure DOM update is complete
            setTimeout(() => {
                if (lastMessage.sender === 'bot') {
                    // For bot messages, use scrollIntoView to bring the TOP of the message into view
                    const element = document.getElementById(`msg-${lastMessage.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } else {
                    // For user messages, simple scroll to bottom is usually fine
                    if (scrollAreaRef.current) {
                        scrollAreaRef.current.scrollTo({
                            top: scrollAreaRef.current.scrollHeight,
                            behavior: 'smooth'
                        });
                    }
                }
            }, 100);
        }
    }, [messages, isTyping, isOpen]);

    const handleScenarioStep = (nextStepKey: string, label: string) => {
        // User selection as message
        const userMsg: Message = {
            id: Date.now().toString(),
            text: label,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // Record selection
        const updatedSelections = { ...userSelections, [label]: label };
        setUserSelections(updatedSelections);

        // Dynamic Logic for HP Closing
        let targetStep = nextStepKey;
        if (nextStepKey === 'hp_closing_dynamic') {
            // Logic:
            // IS_BUSY_MODE === true -> Force C always (or B if generous, but user asked for 14-30 only when busy)
            // Normal Mode:
            // - "Fast Track" accepted -> A (3-7 days)
            // - Photos Ready -> A (3-7 days)
            // - Photos Later -> B (7-14 days)

            if (IS_BUSY_MODE) {
                targetStep = 'hp_closing_c'; // Busy -> 14-30 days
            } else {
                const isFastTrack = updatedSelections['それなら早くできそう！'];
                const hasPhoto = updatedSelections['はい、用意できます'] || updatedSelections['はい、バッチリです'];

                // If Fast Track OR Photos ready -> Shortest time
                if (isFastTrack || hasPhoto) {
                    targetStep = 'hp_closing_a'; // 3-7 days
                } else {
                    // Even if photos not ready, we try to guide to 7-14 days max unless busy
                    targetStep = 'hp_closing_b'; // 7-14 days
                }
            }
        }

        if (targetStep === 'action_payment' || targetStep === 'action_open_plans') {
            // Redirect to Stripe Checkout or Plans Page
            setTimeout(() => {
                const plansSection = document.getElementById('pricing-plans');
                if (plansSection) {
                    plansSection.scrollIntoView({ behavior: 'smooth' });
                    setIsOpen(false); // Close chat to show plans
                } else {
                    console.log("Redirecting...");
                    // If we were on a different page, we might route.push('/plans') here
                }
            }, 1000);
        }

        setTimeout(() => {
            const nextStep = SCENARIO[nextStepKey] || SCENARIO.start;
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: nextStep.botMessage,
                sender: 'bot',
                timestamp: new Date(),
                options: nextStep.options
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 1200); // Slightly longer delay for reading comfort
    };

    const handleSendMessage = async (text: string = inputText) => {
        if (!text.trim()) return;

        // User Message
        const userMsg: Message = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        // Simulate AI processing (Fallback to keyword match if not in scenario)
        setTimeout(() => {
            const lowerText = text.toLowerCase();
            let botResponse = "申し訳ありません。その質問にはまだ答えられませんが、担当者にお繋ぎすることは可能です。";
            let nextOptions = SCENARIO.start.options;

            // Simple Keyword Matching
            if (lowerText.includes('料金') || lowerText.includes('値段')) {
                botResponse = "Lightプランは月額2,480円、Standardプランは月額9,800円からです。";
            } else if (lowerText.includes('hp') || lowerText.includes('制作')) {
                botResponse = SCENARIO.hp_intro.botMessage;
                nextOptions = SCENARIO.hp_intro.options;
            }

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: botResponse,
                sender: 'bot',
                timestamp: new Date(),
                options: nextOptions
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 1000);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <Card className="w-[368px] md:w-[440px] h-[575px] mb-4 shadow-2xl border-blue-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-full">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">AI Customer Support</h3>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    <span className="text-xs text-blue-100">Online</span>
                                </div>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/20 h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-4 bg-gray-50 overflow-y-auto relative" ref={scrollAreaRef}>
                        <div className="flex flex-col gap-4">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    id={`msg-${msg.id}`}
                                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-gray-200' : 'bg-blue-100'
                                        }`}>
                                        {msg.sender === 'user' ? <User className="w-5 h-5 text-gray-500" /> : <Bot className="w-5 h-5 text-blue-600" />}
                                    </div>
                                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-base shadow-sm ${msg.sender === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                        }`}>
                                        <div className="whitespace-pre-wrap">{msg.text}</div>
                                        {msg.options && msg.options.length > 0 && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {msg.options.map((opt, idx) => (
                                                    <button
                                                        key={idx}
                                                        className="text-left text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-3 rounded-lg transition-colors border border-blue-100"
                                                        onClick={() => handleScenarioStep(opt.nextStep, opt.label)}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex items-start gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Bot className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>



                    {/* Input Area */}
                    <div className="p-3 bg-white border-t">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                handleSendMessage();
                            }}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="text"
                                placeholder="質問を入力..."
                                className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                            <Button
                                type="submit"
                                size="icon"
                                className="rounded-full bg-blue-600 hover:bg-blue-700 h-9 w-9"
                                disabled={!inputText.trim() || isTyping}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </Card>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-36 w-36 rounded-full bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-300 animate-bounce hover:animate-none transition-all duration-300 flex flex-col items-center justify-center cursor-pointer gap-1"
                    aria-label="Open Chat"
                >
                    <MessageSquare className="w-14 h-14 text-white" strokeWidth={2.5} fill="white" />
                    <span className="text-white font-black text-xl tracking-tighter">AI CHAT</span>
                </button>
            )}
        </div>
    );
}
