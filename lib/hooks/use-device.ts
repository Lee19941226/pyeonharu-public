"use client";

import { useEffect, useState } from "react";

export function useDevice() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    // ✅ User Agent 체크
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = [
        "android",
        "webos",
        "iphone",
        "ipad",
        "ipod",
        "blackberry",
        "windows phone",
      ];
      return mobileKeywords.some((keyword) => userAgent.includes(keyword));
    };

    // ✅ 화면 크기도 함께 체크
    const checkScreenSize = () => {
      return window.innerWidth <= 768;
    };

    // User Agent 또는 화면 크기로 모바일 판단
    setIsMobile(checkMobile() || checkScreenSize());

    // ✅ 카메라 체크
    const checkCamera = async () => {
      try {
        // ✅ 올바른 존재 여부 체크
        if (
          "mediaDevices" in navigator &&
          "getUserMedia" in navigator.mediaDevices
        ) {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideoInput = devices.some(
            (device) => device.kind === "videoinput",
          );
          setHasCamera(hasVideoInput);
        } else {
          setHasCamera(false);
        }
      } catch {
        setHasCamera(false);
      }
    };

    checkCamera();

    // ✅ 리사이즈 이벤트 리스너
    const handleResize = () => {
      setIsMobile(checkMobile() || checkScreenSize());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile, hasCamera };
}
