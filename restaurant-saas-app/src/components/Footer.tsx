'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-100 py-12 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    {/* Brand / Copyright */}
                    <div className="text-center md:text-left">
                        <span className="text-xl font-black bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
                            MogMog
                        </span>
                        <p className="mt-2 text-sm text-gray-500 font-medium">
                            © {currentYear} MogMog. All rights reserved.
                        </p>
                    </div>

                    {/* Legal Links */}
                    <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4">
                        <Link
                            href="/legal/terms"
                            className="text-sm font-bold text-gray-600 hover:text-orange-500 transition-colors"
                        >
                            利用規約
                        </Link>
                        <Link
                            href="/legal/privacy"
                            className="text-sm font-bold text-gray-600 hover:text-orange-500 transition-colors"
                        >
                            プライバシーポリシー
                        </Link>
                        <Link
                            href="/legal/commercial"
                            className="text-sm font-bold text-gray-600 hover:text-orange-500 transition-colors"
                        >
                            特定商取引法に基づく表記
                        </Link>
                    </nav>

                    {/* Support / Contact (Optional placeholder) */}
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 bg-gray-50 rounded-full border border-gray-100 italic">
                            <span className="text-xs text-gray-400 font-bold">Restaurant AI Partner</span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
