'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';

// SVG Icons (Dependency-free)
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
);
const LoaderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);

interface ReviewReplyButtonProps {
    reviewText: string;
    customerName?: string;
    rating: number;
    onReplyGenerated: (reply: string) => void;
    className?: string; // Add className to props
}

export default function ReviewReplyButton({
    reviewText,
    customerName = 'お客様',
    rating,
    onReplyGenerated,
    className,
}: ReviewReplyButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (isGenerating || !reviewText.trim()) return;

        setIsGenerating(true);
        setError(null);

        try {
            // Firebase ID Token 取得
            const user = auth.currentUser;
            if (!user) {
                throw new Error('ログインが必要です');
            }
            const idToken = await user.getIdToken();

            const response = await fetch('/api/generate-reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    reviewText,
                    customerName,
                    starRating: rating,
                    config: {
                        store_name: "マイ店舗",
                        ai_tone: "polite",
                        emoji_level: 2,
                        reply_templates: {},
                        default_signature: "イタリアン SATO 店長"
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.reply) {
                onReplyGenerated(data.reply);
            } else {
                throw new Error('AIからの応答が空でした。');
            }

        } catch (err: any) {
            console.error('Generation failed:', err);
            setError(err.message || '生成に失敗しました。');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`flex flex-col items-start gap-2 my-2 ${className || ''}`}>
            <button
                onClick={handleGenerate}
                disabled={isGenerating || !reviewText}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold shadow-sm transition-all
          ${isGenerating
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}
        `}
            >
                {isGenerating ? <LoaderIcon /> : <SparklesIcon />}
                {isGenerating ? 'AIが思考中...' : 'AI返信案を作成'}
            </button>

            {error && (
                <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                    ⚠️ {error}
                </span>
            )}
        </div>
    );
}
