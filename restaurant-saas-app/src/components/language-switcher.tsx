"use client";

import React from "react";
import { Globe } from "lucide-react";
import { motion } from "framer-motion";

interface LanguageSwitcherProps {
    currentLang: "ja" | "en";
    onSwitch: (lang: "ja" | "en") => void;
}

export function LanguageSwitcher({ currentLang, onSwitch }: LanguageSwitcherProps) {
    return (
        <div className="fixed top-8 right-8 z-[100] flex items-center gap-2 bg-white/80 backdrop-blur-md border border-[#e5e0d8] rounded-full p-1 shadow-lg shadow-black/5">
            <button
                onClick={() => onSwitch("ja")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentLang === "ja"
                        ? "bg-[#b8860b] text-white shadow-md shadow-[#b8860b]/20"
                        : "text-[#8c857d] hover:text-[#2c2825]"
                    }`}
            >
                日本語
            </button>
            <button
                onClick={() => onSwitch("en")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${currentLang === "en"
                        ? "bg-[#b8860b] text-white shadow-md shadow-[#b8860b]/20"
                        : "text-[#8c857d] hover:text-[#2c2825]"
                    }`}
            >
                <Globe className="size-3" />
                ENGLISH
            </button>
        </div>
    );
}
