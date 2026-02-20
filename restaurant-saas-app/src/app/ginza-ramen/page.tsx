"use client";
import React from "react";
import { Noto_Serif_JP } from "next/font/google";
import { motion } from "framer-motion";
import { MapPin, Clock, Phone, ChevronRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { LanguageSwitcher } from "@/components/language-switcher";

const DICT = {
    ja: {
        tagline: "銀座に見出す、至高の一杯",
        title1: "極み、",
        title2: "一筋。",
        conceptTitle: "静寂の中で味わう、研ぎ澄まされた旨味。",
        concept1: "騒がしい日常を忘れ、ただ一杯のラーメンと向き合う時間。",
        concept2: "厳選された国産小麦、数種類の地鶏から抽出した黄金色のスープ、そして職人の手仕事が織りなす繊細な麺。",
        concept3: "銀座の路地裏にひっそりと佇む当店で、五感を満たす至福のひとときをお過ごしください。",
        menuTitle: "お品書き",
        accessTitle: "店舗情報",
        addressLabel: "住所",
        hoursLabel: "営業時間",
        lunch: "ランチ",
        dinner: "ディナー",
        closed: "定休日：月曜日・第三火曜日",
        reservation: "予約・整理券発券",
        back: "プラン選択に戻る",
        items: [
            {
                title: "特製 鶏白湯そば",
                price: "1,800円",
                desc: "比内地鶏を贅沢に使用し、8時間炊き上げた濃厚かつ繊細なスープ。トリュフオイルの香りが食欲をそそります。"
            },
            {
                title: "淡麗 琥珀醤油",
                price: "1,600円",
                desc: "3種の熟成醤油をブレンド。透き通るような琥珀色のスープは、深みのあるコクとキレを両立させました。"
            },
            {
                title: "和牛 雲丹まぜそば",
                price: "2,500円",
                desc: "A5ランク黒毛和牛のローストビーフと、北海道産生雲丹を豪快に。特製タレと絡めてお召し上がりください。"
            }
        ]
    },
    en: {
        tagline: "The Pinnacle of Ramen Craftsmanship in Ginza",
        title1: "Purity,",
        title2: "Defined.",
        conceptTitle: "Sensory Refinement in Every Drop.",
        concept1: "Escape the ephemeral noise and immerse yourself in the singular pursuit of ramen excellence.",
        concept2: "A golden elixir extracted from premier heritage poultry, paired with delicate noodles crafted from meticulously selected domestic wheat.",
        concept3: "Tucked away in the quiet backstreets of Ginza, experience a moment of culinary bliss that awakens every sense.",
        menuTitle: "Our Menu",
        accessTitle: "Access & Info",
        addressLabel: "Address",
        hoursLabel: "Opening Hours",
        lunch: "Lunch",
        dinner: "Dinner",
        closed: "Closed: Mondays & 3rd Tuesday of the month",
        reservation: "Book a Table",
        back: "Back to Plans",
        items: [
            {
                title: "Premium Tori-Paitan",
                price: "¥1,800",
                desc: "A rich yet elegant broth extracted over 8 hours from premium Hinai-Jidori poultry. Finished with decadent truffle oil to awaken the palate."
            },
            {
                title: "Exquisite Amber Soy",
                price: "¥1,600",
                desc: "A sophisticated blend of three aged soy sauces. Clear amber broth offering a harmonious balance of deep umami and a clean, refreshing finish."
            },
            {
                title: "Wagyu & Sea Urchin Mazesoba",
                price: "¥2,500",
                desc: "Decadent A5-rank Wagyu roast beef paired with Hokkaido sea urchin. A luxurious dry ramen tossed in our secret signature glaze."
            }
        ]
    }
};

const notoSerifJP = Noto_Serif_JP({
    subsets: ["latin"],
    weight: ["300", "400", "500", "700"],
    display: "swap",
});

const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 1, ease: "easeOut" as const }
    },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.3,
        },
    },
};

export default function GinzaRamenPage() {
    const [lang, setLang] = React.useState<"ja" | "en">("ja");
    const t = DICT[lang];

    return (
        <div className={`min-h-screen bg-[#fcfaf7] text-[#4a4540] ${notoSerifJP.className} overflow-x-hidden`}>
            {/* Language Switcher */}
            <LanguageSwitcher currentLang={lang} onSwitch={setLang} />

            {/* PLAN BACK BUTTON (Fixed & Large) */}
            <button
                onClick={() => window.close()}
                className="fixed top-8 left-8 z-[100] 
                           bg-sky-500 hover:bg-sky-600 
                           text-white font-black 
                           px-8 py-4 rounded-full 
                           shadow-[0_8px_20px_rgba(14,165,233,0.4)] 
                           flex items-center gap-3 
                           transition-all hover:scale-105 active:scale-95 
                           group border border-sky-400"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-lg">{t.back}</span>
            </button>

            {/* Top Compact Section (Header + Concept) */}
            <section className="relative w-full flex flex-col items-center justify-center pt-10 pb-12 px-6 border-b border-[#e5e0d8] overflow-hidden">
                {/* Interior Background Image (Hero) */}
                <div className="absolute inset-0 z-0 bg-black">
                    <Image
                        src="/images/ginza_interior_final_v2.jpg"
                        alt="Ginza Ramen Interior"
                        fill
                        className="object-cover"
                        priority
                    />
                    {/* Dark Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-black/50"></div>
                </div>

                <div className="z-20 w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-8 relative text-white">

                    {/* Header Tagline - Compact */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <p className="text-gray-300 tracking-[0.3em] text-sm font-light mb-2">{t.tagline}</p>
                        <h1 className="text-4xl md:text-5xl font-thin tracking-widest text-white flex items-center justify-center gap-4 drop-shadow-md">
                            <span className="border-b border-[#d4af37] pb-1">{t.title1}</span>
                            <span className="pb-1">{t.title2}</span>
                        </h1>
                    </motion.div>

                    {/* Concept Text - Compact & Closer */}
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4"
                    >
                        <h2 className="text-lg md:text-xl font-medium text-[#ffd700] tracking-wider drop-shadow-sm">
                            {t.conceptTitle}
                        </h2>

                        <div className="max-w-xl mx-auto space-y-4 text-gray-200 font-light text-sm leading-7 tracking-wide drop-shadow-sm">
                            <p>{t.concept1}</p>
                            <p>{t.concept2}</p>
                            <p>{t.concept3}</p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Menu Section - Immediately following */}
            <section className="py-8 px-6 bg-[#fcfaf7]">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center text-2xl font-light mb-6 tracking-widest text-[#b8860b]"
                    >
                        {t.menuTitle}
                    </motion.h2>

                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {t.items.map((item, index) => {
                            const images = [
                                "/images/menu_paitan_final.png",
                                "/images/menu_soy_final.png",
                                "/images/menu_wagyu_final.png"
                            ];
                            const imageClasses = [
                                "object-cover transition-transform duration-700 group-hover:scale-110",
                                "object-cover transition-transform duration-700 scale-[1.5] group-hover:scale-[1.6]",
                                "object-cover transition-transform duration-700 scale-[0.9] group-hover:scale-[1.0]"
                            ];
                            const colors = ["from-yellow-500/10", "from-amber-500/10", "from-red-500/10"];

                            return (
                                <motion.div
                                    key={index}
                                    variants={fadeIn}
                                    className={`group bg-white p-6 border border-[#e5e0d8] hover:border-[#d4af37] transition-all duration-300 rounded-sm relative overflow-hidden shadow-sm hover:shadow-md/50`}
                                >
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${colors[index]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                    <div className="h-48 bg-[#f5f2ed] mb-4 flex items-center justify-center overflow-hidden border border-[#ebe6df] relative group-hover:border-[#dcd6ce] transition-colors">
                                        <Image
                                            src={images[index]}
                                            alt={item.title}
                                            fill
                                            className={imageClasses[index]}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                    <h3 className="text-lg font-medium text-[#2c2825] mb-1">{item.title}</h3>
                                    <p className="text-[#b8860b] font-medium font-serif mb-3">{item.price}</p>
                                    <p className="text-xs text-[#6e6862] leading-relaxed font-light">{item.desc}</p>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            </section>

            {/* Access Section (Light Theme) */}
            <section className="py-8 px-6 bg-[#fcfaf7] border-t border-[#e5e0d8]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12">
                    <div className="md:w-1/2 space-y-6">
                        <h2 className="text-2xl font-light tracking-widest mb-4 text-[#b8860b]">{t.accessTitle}</h2>

                        <div className="space-y-4 text-[#5e5852] font-light text-sm">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-[#d4af37] mt-1 flex-shrink-0" />
                                <div>
                                    <p className="mb-1">〒104-0061</p>
                                    <p>{lang === 'ja' ? '東京都中央区銀座 4-1' : '4-1 Ginza, Chuo-ku, Tokyo'}</p>
                                    <p className="blur-sm select-none opacity-50 mt-1 transition-opacity duration-300 hover:opacity-100 hover:blur-none cursor-help text-[#8c857d]">
                                        {lang === 'ja' ? '銀座プレイス裏手 路地奥 3階' : 'Ginza Place Back, 3rd Floor'}
                                    </p>
                                    <p className="text-xs text-[#8c857d] mt-1">{lang === 'ja' ? '※完全予約制' : '*Reservation Only'}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-[#d4af37] mt-1 flex-shrink-0" />
                                <div>
                                    <p className="mb-1">{t.hoursLabel}</p>
                                    <div className="flex justify-between w-40 text-sm">
                                        <span>{t.lunch}</span>
                                        <span>11:30 - 14:30</span>
                                    </div>
                                    <div className="flex justify-between w-40 text-sm">
                                        <span>{t.dinner}</span>
                                        <span>17:30 - 22:00</span>
                                    </div>
                                    <p className="text-sm text-[#8c857d] mt-1">{t.closed}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                                <p>03-xxxx-xxxx</p>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-1/2 h-[300px] bg-[#f5f2ed] rounded-sm relative overflow-hidden border border-[#dcd6ce]">
                        <iframe
                            title="Ginza Location"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.7479754683745!2d139.7640553152695!3d35.67198958019657!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188be5454f3439%3A0x7052570dced06c64!2z銀!5e0!3m2!1sja!2sjp!4v1645000000000!5m2!1sja!2sjp"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={false}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#f5f2ed] py-8 text-center text-[#8c857d] text-xs font-light tracking-widest border-t border-[#e5e0d8]">
                <p>&copy; 2026 GINZA KIWAMI RAMEN. ALL RIGHTS RESERVED.</p>
            </footer>

            {/* Sticky Footer for Mobile/Action */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="fixed bottom-0 left-0 right-0 bg-[#fcfaf7]/95 backdrop-blur-md border-t border-[#e5e0d8] p-4 md:p-6 z-50 flex items-center justify-between md:justify-center md:gap-12 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]"
            >
                <div className="hidden md:block text-[#5e5852] text-sm">
                    <span className="text-[#d4af37] mr-2">●</span>
                    {lang === 'ja' ? '只今の待ち時間：' : 'Current wait: '} <span className="font-medium text-[#2c2825]">{lang === 'ja' ? '15分' : '15 min'}</span>
                </div>

                <button className="bg-[#b8860b] hover:bg-[#9a7009] text-white w-full md:w-auto px-8 py-3 text-sm tracking-widest font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#b8860b]/20">
                    <span>{t.reservation}</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </motion.div>
        </div>
    );
}

const notoSerifJP = Noto_Serif_JP({
    subsets: ["latin"],
    weight: ["300", "400", "500", "700"],
    display: "swap",
});

const fadeIn = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 1, ease: "easeOut" as const }
    },
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.3,
        },
    },
};

export default function GinzaRamenPage() {
    return (
        <div className={`min-h-screen bg-[#fcfaf7] text-[#4a4540] ${notoSerifJP.className} overflow-x-hidden`}>
            {/* PLAN BACK BUTTON (Fixed & Large) */}
            <button
                onClick={() => window.close()}
                className="fixed top-8 left-8 z-[100] 
                           bg-sky-500 hover:bg-sky-600 
                           text-white font-black 
                           px-8 py-4 rounded-full 
                           shadow-[0_8px_20px_rgba(14,165,233,0.4)] 
                           flex items-center gap-3 
                           transition-all hover:scale-105 active:scale-95 
                           group border border-sky-400"
            >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-lg">プラン選択に戻る</span>
            </button>

            {/* Top Compact Section (Header + Concept) */}
            <section className="relative w-full flex flex-col items-center justify-center pt-10 pb-12 px-6 border-b border-[#e5e0d8] overflow-hidden">
                {/* Interior Background Image (Hero) */}
                <div className="absolute inset-0 z-0 bg-black">
                    <Image
                        src="/images/ginza_interior_final_v2.jpg"
                        alt="Ginza Ramen Interior"
                        fill
                        className="object-cover"
                        priority
                    />
                    {/* Dark Overlay for Text Readability */}
                    <div className="absolute inset-0 bg-black/50"></div>
                </div>

                {/* Decorative elements (Subtle Gold) */}
                <div className="absolute top-6 right-6 w-24 h-24 border border-[#d4af37]/40 rounded-full opacity-60 animate-pulse z-10"></div>
                <div className="absolute bottom-6 left-6 w-32 h-32 border border-[#d4af37]/30 rounded-full opacity-40 z-10"></div>

                <div className="z-20 w-full max-w-4xl mx-auto flex flex-col items-center text-center space-y-8 relative text-white">

                    {/* Header Tagline - Compact */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <p className="text-gray-300 tracking-[0.3em] text-sm font-light mb-2">銀座に見出す、至高の一杯</p>
                        <h1 className="text-4xl md:text-5xl font-thin tracking-widest text-white flex items-center justify-center gap-4 drop-shadow-md">
                            <span className="border-b border-[#d4af37] pb-1">極み、</span>
                            <span className="pb-1">一筋。</span>
                        </h1>
                    </motion.div>

                    {/* Concept Text - Compact & Closer */}
                    <motion.div
                        variants={fadeIn}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4"
                    >
                        <h2 className="text-lg md:text-xl font-medium text-[#ffd700] tracking-wider drop-shadow-sm">
                            静寂の中で味わう、研ぎ澄まされた旨味。
                        </h2>

                        <div className="space-y-4 text-gray-200 font-light text-sm leading-7 tracking-wide drop-shadow-sm">
                            <p>
                                騒がしい日常を忘れ、ただ一杯のラーメンと向き合う時間。<br />
                                厳選された国産小麦、数種類の地鶏から抽出した黄金色のスープ、<br />
                                そして職人の手仕事が織りなす繊細な麺。
                            </p>
                            <p>
                                銀座の路地裏にひっそりと佇む当店で、<br />
                                五感を満たす至福のひとときをお過ごしください。
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Menu Section - Immediately following */}
            <section className="py-8 px-6 bg-[#fcfaf7]">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center text-2xl font-light mb-6 tracking-widest text-[#b8860b]"
                    >
                        お品書き
                    </motion.h2>

                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {[
                            {
                                title: "特製 鶏白湯そば",
                                price: "1,800円",
                                desc: "比内地鶏を贅沢に使用し、8時間炊き上げた濃厚かつ繊細なスープ。トリュフオイルの香りが食欲をそそります。",
                                color: "from-yellow-500/10",
                                image: "/images/menu_paitan_final.png",
                                imageClass: "object-cover transition-transform duration-700 group-hover:scale-110"
                            },
                            {
                                title: "淡麗 琥珀醤油",
                                price: "1,600円",
                                desc: "3種の熟成醤油をブレンド。透き通るような琥珀色のスープは、深みのあるコクとキレを両立させました。",
                                color: "from-amber-500/10",
                                image: "/images/menu_soy_final.png",
                                imageClass: "object-cover transition-transform duration-700 scale-[1.5] group-hover:scale-[1.6]"
                            },
                            {
                                title: "和牛 雲丹まぜそば",
                                price: "2,500円",
                                desc: "A5ランク黒毛和牛のローストビーフと、北海道産生雲丹を豪快に。特製タレと絡めてお召し上がりください。",
                                color: "from-red-500/10",
                                image: "/images/menu_wagyu_final.png",
                                imageClass: "object-cover transition-transform duration-700 scale-[0.9] group-hover:scale-[1.0]"
                            }
                        ].map((item, index) => (
                            <motion.div
                                key={index}
                                variants={fadeIn}
                                className={`group bg-white p-6 border border-[#e5e0d8] hover:border-[#d4af37] transition-all duration-300 rounded-sm relative overflow-hidden shadow-sm hover:shadow-md/50`}
                            >
                                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${item.color} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                                <div className="h-48 bg-[#f5f2ed] mb-4 flex items-center justify-center overflow-hidden border border-[#ebe6df] relative group-hover:border-[#dcd6ce] transition-colors">
                                    {/* Menu Image */}
                                    <Image
                                        src={item.image}
                                        alt={item.title}
                                        fill
                                        className={item.imageClass}
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                    />
                                </div>
                                <h3 className="text-lg font-medium text-[#2c2825] mb-1">{item.title}</h3>
                                <p className="text-[#b8860b] font-medium font-serif mb-3">{item.price}</p>
                                <p className="text-xs text-[#6e6862] leading-relaxed font-light">{item.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Access Section (Light Theme) */}
            <section className="py-8 px-6 bg-[#fcfaf7] border-t border-[#e5e0d8]">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12">
                    <div className="md:w-1/2 space-y-6">
                        <h2 className="text-2xl font-light tracking-widest mb-4 text-[#b8860b]">店舗情報</h2>

                        <div className="space-y-4 text-[#5e5852] font-light text-sm">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-[#d4af37] mt-1 flex-shrink-0" />
                                <div>
                                    <p className="mb-1">〒104-0061</p>
                                    <p>東京都中央区銀座 4-1</p>
                                    <p className="blur-sm select-none opacity-50 mt-1 transition-opacity duration-300 hover:opacity-100 hover:blur-none cursor-help text-[#8c857d]">
                                        銀座プレイス裏手 路地奥 3階
                                    </p>
                                    <p className="text-xs text-[#8c857d] mt-1">※完全予約制。</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-[#d4af37] mt-1 flex-shrink-0" />
                                <div>
                                    <p className="mb-1">営業時間</p>
                                    <div className="flex justify-between w-40 text-sm">
                                        <span>ランチ</span>
                                        <span>11:30 - 14:30</span>
                                    </div>
                                    <div className="flex justify-between w-40 text-sm">
                                        <span>ディナー</span>
                                        <span>17:30 - 22:00</span>
                                    </div>
                                    <p className="text-sm text-[#8c857d] mt-1">定休日：月曜日・第三火曜日</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-[#d4af37] flex-shrink-0" />
                                <p>03-xxxx-xxxx</p>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-1/2 h-[300px] bg-[#f5f2ed] rounded-sm relative overflow-hidden border border-[#dcd6ce]">
                        <iframe
                            title="Ginza Location"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.7479754683745!2d139.7640553152695!3d35.67198958019657!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188be5454f3439%3A0x7052570dced06c64!2z銀!5e0!3m2!1sja!2sjp!4v1645000000000!5m2!1sja!2sjp"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={false}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        ></iframe>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-[#f5f2ed] py-8 text-center text-[#8c857d] text-xs font-light tracking-widest border-t border-[#e5e0d8]">
                <p>&copy; 2026 GINZA KIWAMI RAMEN. ALL RIGHTS RESERVED.</p>
            </footer>

            {/* Sticky Footer for Mobile/Action */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 2, duration: 0.5 }}
                className="fixed bottom-0 left-0 right-0 bg-[#fcfaf7]/95 backdrop-blur-md border-t border-[#e5e0d8] p-4 md:p-6 z-50 flex items-center justify-between md:justify-center md:gap-12 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]"
            >
                <div className="hidden md:block text-[#5e5852] text-sm">
                    <span className="text-[#d4af37] mr-2">●</span>
                    只今の待ち時間：<span className="font-medium text-[#2c2825]">15分</span>
                </div>

                <button className="bg-[#b8860b] hover:bg-[#9a7009] text-white w-full md:w-auto px-8 py-3 text-sm tracking-widest font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#b8860b]/20">
                    <span>予約・整理券発券</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </motion.div>
        </div>
    );
}
