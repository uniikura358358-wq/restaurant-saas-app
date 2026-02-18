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
            { label: '機能について詳しく教えて下さい', nextStep: 'faq_features_all' },
            { label: '集客に特化した自動AIサービスについて詳しく', nextStep: 'ai_tools_intro' },
            { label: 'HP制作パッケージ（HP作成代行）について', nextStep: 'hp_intro' },
            { label: '料金プランの違いを教えて', nextStep: 'faq_plans_select' },
            { label: 'その他', nextStep: 'other' }
        ]
    },
    faq_features_all: {
        id: 'faq_features_all',
        botMessage: '全プランの主な機能一覧をご説明します！\n\n【Lightプラン】\n・Google口コミ自動返信代行\n・低評価通知 / 炎上防止\n・MEO集客支援\n\n【Standardプラン】\n上記の全機能に加えて…\n・Instagram自動投稿支援\n・AI画像生成 (60枚/月)\n・リピーター獲得SNS強化\n\n【Premiumプラン】\n最上位の全機能として…\n・AI売上・経営データ分析\n・POP/メニューAI自動作成\n・ライバル店AI監視 (5店舗)\n\n特に気になる機能はございますか？',
        options: [
            { label: 'Google口コミ返信', nextStep: 'tool_gmap' },
            { label: 'Instagram自動投稿', nextStep: 'tool_insta' },
            { label: 'POP・画像生成', nextStep: 'tool_visual' },
            { label: '料金プランを見る', nextStep: 'faq_plans_select' }
        ]
    },
    // AI Tools (SaaS Only) Scenario
    ai_tools_intro: {
        id: 'ai_tools_intro',
        botMessage: '集客に特化した自動AIサービスですね！\nこちらは、すでにHPをお持ちの方や、Google/SNSでの集客を真っ先に強化したいオーナー様に最適です。\n\n具体的にどの機能にご興味がありますか？',
        options: [
            { label: 'Google口コミのAI自動返信', nextStep: 'tool_gmap' },
            { label: 'InstagramのAI自動投稿支援', nextStep: 'tool_insta' },
            { label: 'AIによる画像生成・POP作成', nextStep: 'tool_visual' },
            { label: '料金について', nextStep: 'faq_plans_select' }
        ]
    },
    tool_gmap: {
        id: 'tool_gmap',
        botMessage: 'Googleビジネスプロフィールの口コミ返信をAIが代行します。単なる定型文ではなく、お客様一人一人に合わせた丁寧な返信案を1秒で作成します。\n\nまた、★1や★2の低評価がついた際には即座に通知が届くため、迅速な対応で悪評の拡散を防ぐことができます。',
        options: [
            { label: '他の機能も見る', nextStep: 'ai_tools_intro' },
            { label: '料金プランを見る', nextStep: 'faq_plans_select' }
        ]
    },
    tool_insta: {
        id: 'tool_insta',
        botMessage: 'Instagram投稿の「ネタ探し・文章作成・ハッシュタグ選び」をAIがサポートします。\n\nスマホで撮った写真をアップするだけで、AIが魅力的な投稿文を生成。営業の合間にサクッと発信を継続でき、新規客やリピーターの獲得に繋げます。\n※Standardプラン以上でご利用いただけます。',
        options: [
            { label: '他の機能も見る', nextStep: 'ai_tools_intro' },
            { label: '料金プランを見る', nextStep: 'faq_plans_select' }
        ]
    },
    tool_visual: {
        id: 'tool_visual',
        botMessage: 'AIがお店のバナー画像や、店内に掲示するPOPのデザインを自動生成します。\n\n「今日のおすすめ」も、文字を入力するだけでAIがプロ級の画像付きPOPにしてくれます。デザイン会社に頼むコストと時間を大幅に節約できますよ！',
        options: [
            { label: '他の機能も見る', nextStep: 'ai_tools_intro' },
            { label: '料金プランを見る', nextStep: 'faq_plans_select' }
        ]
    },
    // HP Production Scenario
    hp_intro: {
        id: 'hp_intro',
        botMessage: 'HP制作ですね、ありがとうございます！\n初期費用 ¥39,800 で、プロ品質の公式Webサイトを制作し、ドメイン・サーバーの維持管理まで丸投げいただけます。\n\nより良い制作のために、いくつか質問させてください。まず、お店の【店内画像】はお手元にご用意ございますか？',
        options: [
            { label: 'はい、用意できます', nextStep: 'hp_menu' },
            { label: 'これから撮影します', nextStep: 'hp_menu_advice' },
            { label: 'プロに撮影を依頼したい', nextStep: 'hp_photo_req' }
        ]
    },
    hp_menu_advice: {
        id: 'hp_menu_advice',
        botMessage: 'かしこまりました。最近のスマホは非常に高性能ですので、**スクエア（正方形）モード** で撮影していただければ十分素敵な写真が撮れますよ。\n\nスタイリッシュなカード型レイアウトを採用しますので、プロ並みの仕上がりになります。続いてお伺いします。お店のイチオシとなる【売りのメニュー（1〜3商品）】はお決まりでしょうか？',
        options: [
            { label: 'はい、決まっています', nextStep: 'hp_menu_photo' },
            { label: 'まだ迷っています', nextStep: 'hp_menu_consult' }
        ]
    },
    hp_photo_req: {
        id: 'hp_photo_req',
        botMessage: 'プロによる撮影も手配可能です（別途オプション）。最高の一枚でお店をアピールしましょう！\n\n続いてお伺いします。お店のイチオシとなる【売りのメニュー（1〜3商品）】はお決まりでしょうか？',
        options: [
            { label: 'はい、決まっています', nextStep: 'hp_menu_photo' },
            { label: 'これからの相談で決めたい', nextStep: 'hp_menu_consult' }
        ]
    },
    hp_menu: {
        id: 'hp_menu',
        botMessage: 'ありがとうございます！素材があると制作もスムーズです。\n\n続いて、お店のイチオシとなる【売りのメニュー（1〜3商品）】はお決まりでしょうか？\n※1つや2つでも柔軟にレイアウトを調整しますのでご安心ください。',
        options: [
            { label: 'はい、決まっています', nextStep: 'hp_menu_photo' },
            { label: 'まだ迷っています', nextStep: 'hp_menu_consult' }
        ]
    },
    hp_menu_photo: {
        id: 'hp_menu_photo',
        botMessage: '素晴らしいです！\nちなみに、その【3商品の写真画像】もお手元にご用意できそうでしょうか？',
        options: [
            { label: 'はい、用意できます', nextStep: 'hp_details' },
            { label: '撮影はこれからです', nextStep: 'hp_details_advice' },
            { label: '写真がないのですが...', nextStep: 'hp_proposal_temp_image' }
        ]
    },
    hp_menu_consult: {
        id: 'hp_menu_consult',
        botMessage: 'かしこまりました。利益率や人気を考慮して一緒に考えましょう！\n\n仮にメニューが決まったとして、【商品の写真画像】のご用意はできそうでしょうか？',
        options: [
            { label: '用意できます', nextStep: 'hp_details' },
            { label: '撮影が必要です', nextStep: 'hp_details_advice' },
            { label: '難しいかもしれません', nextStep: 'hp_proposal_temp_image' }
        ]
    },
    hp_proposal_temp_image: {
        id: 'hp_proposal_temp_image',
        botMessage: '写真がすぐになくても大丈夫です！\n最初は「文字だけで魅せるメニュー表」で作成し、後からスマホで撮って差し替えることも可能です。これなら **最短3〜7日** でHP公開までいけます！',
        options: [
            { label: 'それなら早くできそう！', nextStep: 'hp_details_fast_track' },
            { label: '写真は自分で用意したい', nextStep: 'hp_details_wait' }
        ]
    },
    hp_details: {
        id: 'hp_details',
        botMessage: 'お写真の準備も問題なさそうですね！安心いたしました。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】はお手元にございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップと同じでOK', nextStep: 'hp_closing_gmap' },
            { label: 'これからまとめます', nextStep: 'hp_closing_prep' }
        ]
    },
    hp_details_fast_track: {
        id: 'hp_details_fast_track',
        botMessage: 'ありがとうございます！ではスピーディーに進めますね。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】はございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップと同じでOK', nextStep: 'hp_closing_gmap' }
        ]
    },
    hp_details_wait: {
        id: 'hp_details_wait',
        botMessage: '承知いたしました。素材が揃い次第、着手させていただきます。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】はお手元にございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップと同じでOK', nextStep: 'hp_closing_gmap' }
        ]
    },
    hp_details_advice: {
        id: 'hp_details_advice',
        botMessage: '承知いたしました。美味しそうな写真は集客の要です！撮影、頑張ってくださいね。\n\n最後に、お店の【基本情報（住所・電話番号・営業時間など）】についてはございますか？',
        options: [
            { label: 'はい、あります', nextStep: 'hp_closing_dynamic' },
            { label: 'Googleマップと同じでOK', nextStep: 'hp_closing_gmap' }
        ]
    },
    hp_closing_prep: {
        id: 'hp_closing_prep',
        botMessage: '承知いたしました！ご契約後の「専用管理画面」からいつでも追加入力いただけます。\nまずは概算の納期をお伝えしましょうか？',
        options: [
            { label: 'はい、納期を知りたい', nextStep: 'hp_closing_dynamic' }
        ]
    },
    hp_closing_a: {
        id: 'hp_closing_a',
        botMessage: 'ご確認ありがとうございます。現在の状況でしたら、\n**最短3〜7日間** で納品可能です！\n\nすぐに集客を加速させたいオーナー様にぴったりです。',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_b: {
        id: 'hp_closing_b',
        botMessage: 'ご確認ありがとうございます。撮影等を含めても、\n**7日〜14日間程度** で納品可能です。\n\n準備を整えて、最高のお店を公開しましょう！',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_c: {
        id: 'hp_closing_c',
        botMessage: '現在非常に多くのご依頼をいただいており、\n**14日間〜30日間程度** の制作期間をいただいております。\n\n一つ一つ丁寧に仕上げさせていただきます。',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_closing_gmap: {
        id: 'hp_closing_gmap',
        botMessage: 'Googleマップの情報を活用することで、手間なくスピーディーに制作可能です！\n現在の状況なら **最短3〜7日間** でお届けできます。',
        options: [
            { label: '料金について詳しく聞く', nextStep: 'hp_price_explanation' }
        ]
    },
    hp_price_explanation: {
        id: 'hp_price_explanation',
        botMessage: '料金の詳細です。\n\n【HP制作パッケージ】\n◆ 初期制作費： **39,800円** (初回のみ)\n◆ 月額（維持費込）： **3,280円〜**\n\n【集客AI特化サービス (HPなし)】\n◆ 初期費用： **0円**\n◆ 月額： **3,980円〜**\n\n※Standard（月額9,800円）以上のプランなら、HPを制作した場合も **HP維持費はすべて月額料金に含まれる（実質無料）** ため、大変お得です！',
        options: [
            { label: 'よくわかりました', nextStep: 'hp_final_check' }
        ]
    },
    hp_final_check: {
        id: 'hp_final_check',
        botMessage: 'ご説明を最後まで聞いてくださり、ありがとうございます。私たちがお店の強力な集客パートナーとなります。\n\nこのままプラン一覧ページをご覧になりますか？',
        options: [
            { label: 'はい、プランを見に行く', nextStep: 'action_open_plans' },
            { label: 'もう少し検討する', nextStep: 'end_consider' }
        ]
    },
    action_open_plans: {
        id: 'action_open_plans',
        botMessage: 'かしこまりました。プラン一覧から、お店にぴったりのものをお選びください！',
        options: []
    },
    faq_plans_select: {
        id: 'faq_plans_select',
        botMessage: '料金プランの違いについてですね。\n\n◆ **Light (3,980円)**: Google口コミ自動返信・MEO対策。新規客の信頼獲得に。\n◆ **Standard (9,800円)**: ＋Instagram自動投稿。リピーターを増やしたい人気店に。\n◆ **Premium (14,800円)**: 全機能 ＋AI売上分析・経営相談。売上最大化を目指すオーナー様へ。\n\n※いずれのプランも年払いで **最大17%お得** になります！',
        options: [
            { label: '集客機能について詳しく', nextStep: 'ai_tools_intro' },
            { label: 'HP制作との同時契約は？', nextStep: 'hp_price_explanation' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    other: {
        id: 'other',
        botMessage: 'その他のお問い合わせですね。AIで解決できない複雑なご相談については、今後お知らせする専用メールアドレスでも個別に受け付け可能です。\n\nまずはAIが精一杯サポートさせていただきますので、気になることを入力してみてください！',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    end_consider: {
        id: 'end_consider',
        botMessage: 'もちろんです。いつでもここでお待ちしております！',
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
            let botResponse = "申し訳ありません。その質問にはまだ正確にお答えできませんが、AIが学習を進めております。お急ぎの場合は、今後お知らせする専用メールアドレスへのお問い合わせも可能です。";
            let nextOptions = SCENARIO.start.options;

            // Simple Keyword Matching
            if (lowerText.includes('機能') || lowerText.includes('できること')) {
                botResponse = SCENARIO.faq_features_all.botMessage;
                nextOptions = SCENARIO.faq_features_all.options;
            } else if (lowerText.includes('料金') || lowerText.includes('値段') || lowerText.includes('プラン')) {
                botResponse = SCENARIO.faq_plans_select.botMessage;
                nextOptions = SCENARIO.faq_plans_select.options;
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
