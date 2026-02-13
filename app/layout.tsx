import React from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { AuthProvider } from "@/contexts/auth-context";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "편하루 - 알레르기 있어도 편안한 메뉴 선택 | 식품 알레르기 확인",
    template: "%s | 편하루",
  },
  description:
    "알레르기가 있어도 편안하게 메뉴를 고를 수 있게. 바코드·사진 한 번이면 알레르기 확인 5초. 급식 알레르기 자동 체크, 내 주변 맛집 알레르기 매칭, AI 증상 분석까지.",
  keywords: [
    "식품 알레르기 확인",
    "바코드 알레르기 체크",
    "급식 알레르기",
    "학교 급식 알레르기",
    "음식 알레르기 앱",
    "알레르기 안전 맛집",
    "식품 성분 확인",
    "알레르기 바코드 스캔",
    "음식 사진 알레르기",
    "AI 증상 분석",
    "병원 찾기",
    "약국 찾기",
    "편하루",
  ],
  authors: [{ name: "편하루" }],
  creator: "편하루",
  publisher: "편하루",
  metadataBase: new URL(
    "https://v0-website-development-plan-beta-six.vercel.app",
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "편하루 - 알레르기 있어도 편안한 메뉴 선택",
    description:
      "바코드·사진으로 알레르기 확인, 급식 체크, 내 주변 맛집 매칭, AI 증상 분석. 편안한 하루의 식사.",
    type: "website",
    locale: "ko_KR",
    siteName: "편하루",
    url: "https://v0-website-development-plan-beta-six.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "편하루 - 알레르기 있어도 편안한 메뉴 선택",
    description:
      "바코드·사진으로 알레르기 확인 5초. 급식 체크, 맛집 매칭, AI 증상 분석.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4A7C59" },
    { media: "(prefers-color-scheme: dark)", color: "#4A7C59" },
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
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4884937144207124"
          crossOrigin="anonymous"
        ></script>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Kakao SDK */}
        <script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          async
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
