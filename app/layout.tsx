import React from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { AuthProvider } from "@/contexts/auth-context";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "편하루 - 우리 가족 식품 안전",
  description:
    "바코드 한 번으로 식품 알레르기 확인. 내 주변 병원/약국 찾기, AI 증상 분석까지. 편하루와 함께 일상을 더 편하게 만들어보세요.",
  generator: "v0.app",
  keywords: [
    "식품 알레르기",
    "바코드 알레르기",
    "병원 찾기",
    "약국 찾기",
    "증상 분석",
    "급식 알레르기",
  ],
  authors: [{ name: "편하루" }],
  openGraph: {
    title: "편하루 - 우리 가족 식품 안전",
    description:
      "바코드 한 번으로 식품 알레르기 확인. 내 주변 병원/약국 찾기, AI 증상 분석까지.",
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
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
