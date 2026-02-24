/**
 * 배달앱 딥링크 유틸
 * - 모바일: 앱 URI scheme으로 직접 앱 호출
 * - PC: 비활성 (모바일에서만 이용 가능)
 */

export interface DeliveryApp {
  name: string;
  color: string;
  /** 앱 딥링크 (모바일 전용) */
  appUrl: string;
}

/** 모바일 환경인지 판별 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/** 배달앱 딥링크 생성 */
export function getDeliveryLinks(keyword: string): DeliveryApp[] {
  const encoded = encodeURIComponent(keyword);
  return [
    {
      name: "배민",
      color: "bg-[#2AC1BC]",
      appUrl: `baemin://search?query=${encoded}`,
    },
    {
      name: "요기요",
      color: "bg-[#FA0050]",
      appUrl: `yogiyoapp://search?query=${encoded}`,
    },
    {
      name: "쿠팡이츠",
      color: "bg-[#5D00E6]",
      appUrl: `coupangeats://search?query=${encoded}`,
    },
  ];
}

/** 배달앱 열기 (앱 미설치 시 스토어로 이동) */
export function openDeliveryApp(app: DeliveryApp) {
  // 앱 딥링크 시도
  const start = Date.now();
  window.location.href = app.appUrl;

  // 2초 후에도 페이지가 살아있으면 앱 미설치 → 스토어로 이동
  setTimeout(() => {
    if (Date.now() - start < 2500) {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const storeUrls: Record<string, { android: string; ios: string }> = {
        배민: {
          android: "market://details?id=com.sampleapp.baemin",
          ios: "https://apps.apple.com/kr/app/id378084485",
        },
        요기요: {
          android: "market://details?id=com.fineapp.yogiyo",
          ios: "https://apps.apple.com/kr/app/id543929498",
        },
        쿠팡이츠: {
          android: "market://details?id=com.coupang.mobile.eats",
          ios: "https://apps.apple.com/kr/app/id1445504255",
        },
      };
      const store = storeUrls[app.name];
      if (store) {
        window.location.href = isAndroid ? store.android : store.ios;
      }
    }
  }, 2000);
}
