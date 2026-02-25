/**
 * 모바일 햅틱 피드백 (진동)
 * 1순위: Capacitor Haptics 플러그인 (네이티브 앱)
 * 2순위: navigator.vibrate() 폴백 (웹 브라우저)
 * 3순위: 미지원 환경은 무시
 */

type HapticStyle = "light" | "medium" | "heavy";

export async function haptic(style: HapticStyle = "light") {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");

    if (style === "light") {
      // 가장 약한 진동: notification Success (impact Light보다 부드러움)
      await Haptics.notification({ type: NotificationType.Success });
    } else {
      const styleMap: Record<string, any> = {
        medium: ImpactStyle.Light,
        heavy: ImpactStyle.Medium,
      };
      await Haptics.impact({ style: styleMap[style] });
    }
  } catch {
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        const ms = style === "heavy" ? 15 : style === "medium" ? 8 : 3;
        navigator.vibrate(ms);
      }
    } catch {
      // 진동 미지원 환경 무시
    }
  }
}
