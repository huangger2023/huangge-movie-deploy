import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const pixelTitle = Press_Start_2P({ weight: "400", subsets: ["latin"] });
const pixelBody = VT323({ weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "荒哥说电影 · 抖音电影解说课程与实操工具",
  description:
    "荒哥说电影聚焦抖音电影解说的选片、拆片、文案、配音、发布与复盘，配套 AI 初稿、标题和改稿工具，帮助创作者建立稳定的实操流程。",
  keywords: ["电影解说", "抖音", "短视频创作", "AI文案", "影视解说", "创作者中心", "内容复盘", "荒哥说电影"],
  authors: [{ name: "荒哥说电影" }],
  openGraph: {
    title: "荒哥说电影 · 抖音电影解说课程与实操工具",
    description: "围绕选片、文案、配音、发布和复盘整理的电影解说课程与工具。",
    siteName: "荒哥说电影",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${pixelTitle.variable} ${pixelBody.variable}`}>
      <body
        className="antialiased bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
