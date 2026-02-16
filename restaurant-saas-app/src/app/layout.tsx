import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AdminWrapper } from "@/components/admin/AdminWrapper";
import { checkRequiredEnvVars } from "@/lib/check-env";

// 起動時に環境変数をチェック (Phase 0: 安全装置)
checkRequiredEnvVars();

// フォントの設定
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// メタデータの設定（飲食店向けSaaSとしての内容に更新）
export const metadata: Metadata = {
  title: "飲食店SaaS AI - 店舗管理",
  description: "Google口コミ自動返信・SNS投稿自動化ツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJp.variable} font-sans antialiased`}
      >
        <AdminWrapper>
          {/* メインコンテンツ */}
          {children}

          {/* トースト通知の設定：画面上部中央に表示し、ステータスに応じた色を付ける */}
          <Toaster position="top-center" richColors closeButton />
        </AdminWrapper>
      </body>
    </html>
  );
}