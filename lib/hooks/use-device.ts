"use client";

import { useState, useEffect } from "react";

export function useDevice() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  useEffect(() => {
    // 모바일 감지
    const checkMobile = () => {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobile(mobile);
    };

    // 카메라 사용 가능 여부
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );
        setHasCamera(videoDevices.length > 0);
      } catch {
        setHasCamera(false);
      }
    };

    checkMobile();
    checkCamera();
  }, []);

  return { isMobile, hasCamera };
}
