import React from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { AuthProvider } from "@/contexts/auth-context";
import { LoginModal } from "@/components/auth/login-modal";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "편하루 - 의식주를 편하게",
  description:
    "내 주변 병원/약국 찾기, AI 증상 분석, 날씨 기반 옷차림 추천까지. 편하루와 함께 일상을 더 편하게 만들어보세요.",
  generator: "v0.app",
  keywords: [
    "병원 찾기",
    "약국 찾기",
    "증상 분석",
    "옷차림 추천",
    "날씨 코디",
    "의식주",
  ],
  authors: [{ name: "편하루" }],
  openGraph: {
    title: "편하루 - 의식주를 편하게",
    description:
      "내 주변 병원/약국 찾기, AI 증상 분석, 날씨 기반 옷차림 추천까지.",
    type: "website",
    locale: "ko_KR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4ade80" },
    { media: "(prefers-color-scheme: dark)", color: "#22c55e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Script
          strategy="beforeInteractive"
          src={`https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
        <AuthProvider>
          <LoginModal />
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
