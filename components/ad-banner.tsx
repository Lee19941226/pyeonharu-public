"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ShareBottomSheet } from "@/components/share-bottom-sheet";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdBannerProps {
  format?: string;
  responsive?: boolean;
  className?: string;
}

const isDev = process.env.NODE_ENV === "development";

type AdState = "loading" | "filled" | "fallback";

export function AdBanner({
  format = "auto",
  responsive = true,
  className = "",
}: AdBannerProps) {
  const pushed = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [adState, setAdState] = useState<AdState>("loading");

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      setAdState("fallback");
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new MutationObserver(() => {
      const ins = el.querySelector("ins");
      if (!ins) return;
      if (ins.dataset.adStatus === "filled") {
        setAdState("filled");
        observer.disconnect();
      } else if (ins.dataset.adStatus === "unfilled") {
        setAdState("fallback");
        observer.disconnect();
      }
    });

    observer.observe(el, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-ad-status"],
    });

    // 3초 내 응답 없으면 폴백
    const timer = setTimeout(() => {
      if (adState === "loading") setAdState("fallback");
    }, 3000);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (adState === "fallback") {
    return <FallbackBanner className={className} />;
  }

  return (
    <>
      {/* AdSense 스크립트 - 광고 컴포넌트가 렌더링되는 페이지에서만 로드 */}
      <Script
        id="adsense-script"
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4884937144207124"
        crossOrigin="anonymous"
      />
      <div ref={containerRef} className={adState === "filled" ? "" : "hidden"}>
        <ins
          className={`adsbygoogle ${className}`}
          style={{ display: "block" }}
          data-ad-client="ca-pub-4884937144207124"
          data-ad-slot="4131902108"
          data-ad-format={format}
          data-full-width-responsive={responsive ? "true" : "false"}
          {...(isDev && { "data-adtest": "on" })}
        />
      </div>
    </>
  );
}

const FALLBACK_SHARE_DATA = {
  title: "편하루 - 식사를 편하게",
  description:
    "메뉴 선정부터 병원 찾기까지, 편하루가 도와드려요. 친구에게 공유하고 동창들과 커뮤니티도 이용해보세요!",
  imageUrl: "https://www.pyeonharu.com/icons/icon-512.png",
  shareUrl: "https://www.pyeonharu.com",
};

function FallbackBanner({ className }: { className?: string }) {
  const [showShareSheet, setShowShareSheet] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowShareSheet(true)}
        className={`w-full rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 text-left transition-colors hover:border-primary/40 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-primary">
              메뉴 선정부터 병원 찾기까지, 편하루가 도와드려요
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              친구에게 공유하고 동창들과 커뮤니티도 이용해보세요!
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            공유하기
          </span>
        </div>
      </button>
      <ShareBottomSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        data={FALLBACK_SHARE_DATA}
      />
    </>
  );
}
