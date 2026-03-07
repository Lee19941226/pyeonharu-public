import React from "react";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { AuthProvider } from "@/contexts/auth-context";
import { HapticProvider } from "@/components/haptic-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { BackButtonHandler } from "@/components/back-button-handler";
import { StatusBarInit } from "@/components/status-bar-init";
import { OAuthDeepLinkHandler } from "@/components/oauth-deep-link-handler";
import { HeartbeatProvider } from "@/components/providers/heartbeat-provider";
import { PageTrackerProvider } from "@/components/providers/page-tracker-provider";
import { AdSidebar } from "@/components/ad-sidebar";

export const metadata: Metadata = {
  title: {
    default: "편하루 - 식사를 편하게",
    template: "%s | 편하루",
  },
  description:
    "식사를 편하게. 바코드·사진 한 번이면 알레르기 확인 5초. 급식 알레르기 자동 체크, 내 주변 맛집 매칭, 칼로리 관리, AI 증상 분석까지.",
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
  metadataBase: new URL("https://www.pyeonharu.com"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/pyeonharu-icon.svg",
  },
  openGraph: {
    title: "편하루 - 식사를 편하게",
    description:
      "바코드·사진으로 알레르기 확인, 급식 체크, 맛집 매칭, 칼로리 관리까지. 편안한 하루의 식사.",
    type: "website",
    locale: "ko_KR",
    siteName: "편하루",
    url: "https://www.pyeonharu.com",
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
  viewportFit: "cover",
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
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <Script
          strategy="afterInteractive"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
        />
        <Script
          strategy="afterInteractive"
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        />
        <AuthProvider>
          <BackButtonHandler />
          <StatusBarInit />
          <OAuthDeepLinkHandler />
          <HapticProvider>
            <HeartbeatProvider>
              <PageTrackerProvider>{children}</PageTrackerProvider>
            </HeartbeatProvider>
            <Toaster />
          </HapticProvider>
        </AuthProvider>
        <Analytics />
        <AdSidebar />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
                    .then(function(reg) {
                      console.log('[SW] 등록 성공:', reg.scope);
                      reg.update();
                    })
                    .catch(function(err) {
                      console.warn('[SW] 등록 실패:', err);
                    });

                  var refreshing = false;
                  navigator.serviceWorker.addEventListener('controllerchange', function() {
                    if (refreshing) return;
                    refreshing = true;
                    window.location.reload();
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
