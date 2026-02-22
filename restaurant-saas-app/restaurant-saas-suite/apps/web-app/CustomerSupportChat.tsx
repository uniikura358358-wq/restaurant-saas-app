'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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

// --- 販売用シナリオ (Prospects) ---
const SCENARIO_SALES: Record<string, ScenarioStep> = {
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
        botMessage: '全プランの主な機能一覧をご説明します！\n\n【Standard】\n・Google口コミ返信案の作成 (400回/月)\n・AI画像生成 (50枚/月)\n・低評価通知 / 炎上防止\n・MEO集客支援\n\n【Pro】\n上記の全機能に加えて…\n・AIテキスト生成合計 (1,000回/月)\n・Instagram自動投稿支援\n・AI画像生成 (200枚/月)\n・AIにおまかせ日替わりスケジュール表示\n\n【Pro Premium】\n最上位の全機能として…\n・AIテキスト生成合計 (1,700回/月)\n・AI売上・経営データ分析\n・AI画像生成 (450枚/月)\n・POP/メニューAI自動作成\n・ライバル店AI監視 (5店舗)\n\n特に気になる機能はございますか？',
        options: [
            { label: 'Google口コミ返信', nextStep: 'tool_gmap' },
            { label: 'Instagram自動投稿', nextStep: 'tool_insta' },
            { label: 'POP・画像生成', nextStep: 'tool_visual' },
            { label: '料金プランを見る', nextStep: 'faq_plans_select' }
        ]
    },
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
        botMessage: 'Instagram投稿の「ネタ探し・文章作成・ハッシュタグ選び」をAIがサポートします。\n\nスマホで撮った写真をアップするだけで、AIが魅力的な投稿文を生成。営業の合間にサクッと発信を継続でき、新規客やリピーターの獲得に繋げます。\n※Proプラン以上でご利用いただけます。',
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
        botMessage: '料金の詳細です。\n\n【HP制作パッケージ】\n◆ 初期制作費： **39,800円** (初回のみ)\n◆ 月額（維持費込）： **3,280円〜** (web Light)\n\n【集客AI特化サービス (HPなし)】\n◆ 初期費用： **0円**\n◆ 月額： **3,980円〜** (Standard)\n\n※Pro（月額9,800円）以上のプランなら、HPを制作した場合も **HP維持費はすべて月額料金に含まれる（実質無料）** ため、大変お得です！',
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
        botMessage: '料金プランの違いについてですね。\n\n◆ **Standard (3,980円)**: Google口コミ返信(400回)・画像生成(50枚)。\n◆ **Pro (9,800円)**: オススメ！プラン。＋Instagram投稿支援・テキスト生成合計(1,000回)・画像生成(200枚)。\n◆ **Pro Premium (14,800円)**: 全機能 ＋AI売上分析・経営相談・テキスト生成合計(1,700回)・画像生成(450枚)。\n\n※いずれのプランも年払いで **最大17%（約2ヶ月分）お得** になります！',
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

// --- 会員用シナリオ (Members/Admin) ---
const SCENARIO_MEMBER: Record<string, ScenarioStep> = {
    start: {
        id: 'start',
        botMessage: 'ご利用ありがとうございます。飲食店経営専門のAIコンサルタントです。\n\n事務作業の効率化から、税務・財務戦略、資金繰りの改善まで、専門的な知見を持ってサポートいたします。本日はどのような戦略をご検討でしょうか？',
        options: [
            { label: 'AI会計・帳簿（新機能）の使い方', nextStep: 'member_ai_accounting_guide' },
            { label: 'インボイス用シートをAIで作る', nextStep: 'member_tax_invoice_sheet' },
            { label: '税務・確定申告の相談', nextStep: 'member_tax_consultant' },
            { label: '財務・経営分析の相談', nextStep: 'member_finance_consultant' },
            { label: 'Google/SNS集客の強化', nextStep: 'member_marketing_tips' },
            { label: '設定・トラブル解決', nextStep: 'member_trouble' }
        ]
    },
    // --- 新機能：AI会計カテゴリ ---
    member_ai_accounting_guide: {
        id: 'member_ai_accounting_guide',
        botMessage: '最新の「AI事務管理」機能についてご説明します。この機能は、オーナー様が経理作業を一切行わない世界を目指しています。\n\n1. **AI書類仕訳**: カメラや音声での入力をAIが解析。勘定科目の判定から帳簿への転記まで自動で行います。\n2. **デジタル・キャビネット**: 全書類がAIによって「食材」「光熱費」等に自動フォルダ分け。検索も一瞬です。\n3. **収支・帳簿**: 売上と経費から損益(P/L)をリアルタイム算出。確定申告の準備率も可視化されます。\n4. **CSVエクスポート**: freeeやマネフォ形式で出力。即座に公式帳簿として連携可能です。',
        options: [
            { label: 'AI仕訳のコツを知りたい', nextStep: 'member_ai_ocr_tips' },
            { label: '会計ソフトとの連携方法', nextStep: 'member_csv_guide' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    member_ai_ocr_tips: {
        id: 'member_ai_ocr_tips',
        botMessage: 'AIの精度を最大化するためのプロのコツです。\n\n1. **音声入力**: 「佐藤精肉店で3000円」と店名を合わせると、AIが過去のデータと照合し、より正確に仕訳けます。\n2. **カメラ撮影**: レシートは平らにして。影が入らないように撮ると、AIが電話番号から事業者を特定し、勘定科目を100%の精度で選び出します。\n3. **修正学習**: AIが間違えた場合、一度手動で修正いただければ、次回からはその仕訳をAIが「学習」します。',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    member_csv_guide: {
        id: 'member_csv_guide',
        botMessage: '外部会計ソフトとの連携手順です。\n\n1. 「収支・帳簿」タブの最下部にある「会計ソフト用データ出力」へ移動します。\n2. freeeまたはマネーフォワードのボタンを押し、専用ファイルをダウンロードします。\n3. 会計ソフト側の「インポート機能」でそのファイルを選択するだけで、月次の処理が完了します。\n※将来的にAPIによる完全自動同期も開放予定です。',
        options: [
            { label: 'インボイス用のシートも欲しい', nextStep: 'member_tax_invoice_sheet' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    member_tax_invoice_sheet: {
        id: 'member_tax_invoice_sheet',
        botMessage: 'インボイス制度に完全準拠した「AIカスタム帳簿（スプレッドシート形式）」を作成します。これにはT番号の照合履歴、税率ごとの自動集計、そして電子帳簿保存法に対応したインデックスが含まれます。\n\n「収支・帳簿」タブの出力セクションにある「AIカスタム帳簿 (Excel/Sheet)」ボタンから、いつでも最新の状態を書き出せます。今すぐ場所を確認しますか？',
        options: [
            { label: '出力場所を見る', nextStep: 'member_ai_accounting_guide' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    // --- 専門領域：税務コンサル ---
    member_tax_consultant: {
        id: 'member_tax_consultant',
        botMessage: '税務戦略についてのアドバイスです。飲食店に特化した節税や確定申告のポイントをお伝えします。\n\n何を詳しくお聞きになりたいですか？',
        options: [
            { label: '青色申告65万控除の条件', nextStep: 'tax_blue_declaration' },
            { label: '経費になる「まかない」や「交際費」', nextStep: 'tax_expenses' },
            { label: '自宅兼店舗の「家事按分」', nextStep: 'tax_proportion' },
            { label: '消費税のインボイス対応', nextStep: 'tax_invoice' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    tax_blue_declaration: {
        id: 'tax_blue_declaration',
        botMessage: '青色申告特別控除（最大65万円）を受けるための必須条件です。\n\n1. **複式簿記での記帳**: 当アプリのAI仕訳がこれを強力にサポートします。\n2. **e-Taxでの提出**: 当アプリから書き出したCSVを会計ソフト経由で送信すれば達成可能です。\n3. **期限内申告**: ダッシュボードの「確定申告準備状況」をチェックし、常に80%以上を維持しましょう。',
        options: [
            { label: '他の税務相談を見る', nextStep: 'member_tax_consultant' }
        ]
    },
    tax_expenses: {
        id: 'tax_expenses: ',
        botMessage: '飲食店の経費判断は非常に重要です。\n\n1. **まかない**: 原価の半分以上を従業員が負担し、かつ月3500円(税抜)以下なら非課税経費に。それ以外は給与扱いになるので注意。\n2. **接待交際費**: 他店の偵察（市場調査費）や、常連さんへのサービスは積極的に。ただし、1人5000円以下の飲食は「会議費」として処理した方が税務上有利な場合があります。\n3. **AIによる分類**: これらは「AI書類仕訳」時に摘要（メモ）に理由を添えると、AIが正確に分類します。',
        options: [
            { label: '他の税務相談を見る', nextStep: 'member_tax_consultant' }
        ]
    },
    // --- 専門領域：財務コンサル ---
    member_finance_consultant: {
        id: 'member_finance_consultant',
        botMessage: '財務・資金繰りの改善相談ですね。数字からお店の「健康状態」を診断します。\n\nどの指標が気になりますか？',
        options: [
            { label: '理想のFL比率（原価＋人件費）', nextStep: 'finance_fl_ratio' },
            { label: '原価率30%に抑えるテクニック', nextStep: 'finance_cost_control' },
            { label: '資金繰り（キャッシュフロー）改善', nextStep: 'finance_cashflow' },
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    finance_fl_ratio: {
        id: 'finance_fl_ratio',
        botMessage: '飲食店の生命線、FL比率（Food + Labor）は**60%以下**が目標です。\n\n・F（食材原価）: 30%\n・L（人件費）: 30%\n現在、多くのお店で原材料高騰によりFが35〜40%に迫っています。人件費を下げるのが難しいため、AI活用による事務コスト（Lの一部）の削減が、利益確保の鍵となります。',
        options: [
            { label: '原価削減のヒント', nextStep: 'finance_cost_control' },
            { label: '他の財務相談を見る', nextStep: 'member_finance_consultant' }
        ]
    },
    finance_cashflow: {
        id: 'finance_cashflow',
        botMessage: '黒字倒産を防ぐための財務戦略です。\n\n1. **売上の即時把握**: POS連携で毎日のキャッシュをリアルタイム管理しましょう。\n2. **支払期限の適正化**: 可能な限りカード払いや翌月払いを活用し、手元の現金を残します。\n3. **AI予測**: 「収支・帳簿」タブで翌月の納税額を予測し、税金の支払いで慌てない準備をします。',
        options: [
            { label: '他の財務相談を見る', nextStep: 'member_finance_consultant' }
        ]
    },
    // --- 集客・マーケティング（既存強化） ---
    member_marketing_tips: {
        id: 'member_marketing_tips',
        botMessage: '集客戦略のプロフェッショナルな知見です。\n\n1. **Google MEO**: 返信は12時間以内に。AI自動返信がSEO（検索順位）を劇的に改善します。\n2. **Insta Branding**: AIが生成する「シズル感」のある投稿文で、スマホ越しの食欲を刺激しましょう。\n3. **リピーター戦略**: AIチャットを使って顧客体験を高め、来店サイクルを30日から20日に縮める施策をご相談ください。',
        options: [
            { label: '最初に戻る', nextStep: 'start' }
        ]
    },
    member_trouble: {
        id: 'member_trouble',
        botMessage: '緊急の問題でしょうか。解決策をご案内します。\n\n・**レシートが読めない**: 明るい場所で。AIは「電話番号」が見えていれば大抵のことは解決します。\n・**連携エラー**: ブラウザのキャッシュクリアを。特にPOS連携は再認証が必要な場合があります。\n・**専門家への相談**: AIでは答えられない複雑な裁判沙汰などは、提携の専門家（税理士・弁護士）へお繋ぎします。',
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
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    // Determines which scenario to use based on the current path
    const isAdminPath = pathname.startsWith('/dashboard') || pathname.startsWith('/settings') || pathname.startsWith('/tools');
    const SCENARIO = isAdminPath ? SCENARIO_MEMBER : SCENARIO_SALES;

    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize messages based on current scenario
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                text: SCENARIO.start.botMessage,
                sender: 'bot',
                timestamp: new Date(),
                options: SCENARIO.start.options
            }]);
        }
    }, [SCENARIO]);
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
            let botResponse = "専門的なご質問ありがとうございます。AIコンサルタントとしてさらに深い知見をご提供できるよう、具体的な状況（業態や現在の課題など）を教えていただけますでしょうか。";
            let nextOptions = SCENARIO.start.options;

            // Professional Consultant Keyword Matching
            if (lowerText.includes('税金') || lowerText.includes('税務') || lowerText.includes('確定申告') || lowerText.includes('節税')) {
                botResponse = "税務戦略は利益最大化の要です。当アプリではAIが日々の支払いを帳簿化し、青色申告65万円控除を確実に狙える体制を構築します。特に「家事按分」や「飲食接待費」の適切な処理により、実質的なキャッシュフローを改善可能です。";
                nextOptions = isAdminPath ? SCENARIO_MEMBER.member_tax_consultant.options : SCENARIO_SALES.faq_features_all.options;
            } else if (lowerText.includes('原価') || lowerText.includes('財務') || lowerText.includes('利益') || lowerText.includes('fl')) {
                botResponse = "飲食店の財務健全性はFL比率（Food + Labor）で決まります。目標は60%以下です。当アプリの財務分析機能を使えば、原材料高騰の中でも利益を削らないための「メニュー価格見直し」や「シフト最適化」の判断材料をリアルタイムで得られます。";
                nextOptions = isAdminPath ? SCENARIO_MEMBER.member_finance_consultant.options : SCENARIO_SALES.faq_features_all.options;
            } else if (lowerText.includes('ai会計') || lowerText.includes('仕訳') || lowerText.includes('帳簿') || lowerText.includes('csv') || lowerText.includes('シート') || lowerText.includes('スプレッドシート') || lowerText.includes('エクセル')) {
                botResponse = "最新のAI事務管理機能ですね。インボイス対応の「AIカスタム帳簿（スプレッドシート）」の作成も可能です。これは単なるツールではなく、オーナー様の『自由な時間』を創出するソリューションです。レシートを撮るだけで、複式簿記の帳簿が完成し、そのままExcel形式や会計ソフトへ出力できます。";
                nextOptions = isAdminPath ? SCENARIO_MEMBER.member_tax_invoice_sheet.options : SCENARIO_SALES.ai_tools_intro.options;
            } else if (lowerText.includes('集客') || lowerText.includes('売上') || lowerText.includes('客数')) {
                if (isAdminPath) {
                    botResponse = "集客最大化にはGoogleマップのSEO（MEO）が最優先です。AIによる口コミへの即時返信により、検索順位を上げ、新規客の獲得コストを最小化します。また、Instagramの投稿頻度をAIで維持することも重要です。";
                    nextOptions = SCENARIO_MEMBER.member_marketing_tips.options;
                } else {
                    botResponse = SCENARIO_SALES.ai_tools_intro.botMessage;
                    nextOptions = SCENARIO_SALES.ai_tools_intro.options;
                }
            } else if (lowerText.includes('料金') || lowerText.includes('値段') || lowerText.includes('プラン')) {
                const stepKey = isAdminPath ? 'member_billing_guide' : 'faq_plans_select';
                const step = SCENARIO[stepKey];
                if (step) {
                    botResponse = step.botMessage;
                    nextOptions = step.options;
                }
            } else if (lowerText.includes('機能') || lowerText.includes('できること')) {
                if (isAdminPath) {
                    botResponse = "管理画面では、AIによる全自動仕訳、財務分析、Google/SNSの集客支援、HPの管理など、飲食店経営に必要なすべての武器が揃っています。";
                    nextOptions = SCENARIO_MEMBER.start.options;
                } else {
                    botResponse = SCENARIO_SALES.faq_features_all.botMessage;
                    nextOptions = SCENARIO_SALES.faq_features_all.options;
                }
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
