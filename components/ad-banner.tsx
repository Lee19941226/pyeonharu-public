"use client";

import { useEffect, useRef } from "react";

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

export function AdBanner({
  format = "auto",
  responsive = true,
  className = "",
}: AdBannerProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle not loaded yet
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-client="ca-pub-4884937144207124"
      data-ad-slot="4131902108"
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
