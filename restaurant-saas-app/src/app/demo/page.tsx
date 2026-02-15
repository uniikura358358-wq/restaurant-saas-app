'use client';

import { useState } from 'react';
import ReviewReplyButton from '@/components/ReviewReplyButton';

export default function DemoPage() {
    const dummyReview = {
        text: "スープがとても濃厚で美味しかったです！ただ、提供までに少し時間がかかったのが残念でした。",
        author: "田中 太郎",
        rating: 4
    };

    const [generatedReply, setGeneratedReply] = useState("");

    return (
        <div className="max-w-2xl mx-auto p-8 font-sans">
            <h1 className="text-2xl font-bold mb-6 border-b pb-2">🚀 AI自動返信機能デモ</h1>

            <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">{dummyReview.author} 様の口コミ</h3>
                    <span className="text-yellow-500 font-bold">{'★'.repeat(dummyReview.rating)}</span>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-md mb-4">
                    {dummyReview.text}
                </p>

                <ReviewReplyButton
                    reviewText={dummyReview.text}
                    customerName={dummyReview.author}
                    rating={dummyReview.rating}
                    onReplyGenerated={(reply) => setGeneratedReply(reply)}
                />
            </div>

            <div className="bg-gray-100 p-6 rounded-lg">
                <label className="block text-sm font-bold mb-2 text-gray-700">
                    生成された返信（編集可能）:
                </label>
                <textarea
                    value={generatedReply}
                    onChange={(e) => setGeneratedReply(e.target.value)}
                    placeholder="ボタンを押すと、ここにAIが考えた返信が表示されます..."
                    className="w-full h-48 p-4 border rounded-md shadow-inner focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
            </div>
        </div>
    );
}
