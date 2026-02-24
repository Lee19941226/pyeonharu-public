/**
 * 모바일 햅틱 피드백 (진동)
 * 1순위: Capacitor Haptics 플러그인 (네이티브 앱)
 * 2순위: navigator.vibrate() 폴백 (웹 브라우저)
 * 3순위: 미지원 환경은 무시
 */

type HapticStyle = "light" | "medium" | "heavy";

export async function haptic(style: HapticStyle = "light") {
  try {
    // 1순위: Capacitor Haptics (네이티브 앱에서 확실히 동작)
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const styleMap: Record<HapticStyle, any> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: styleMap[style] });
  } catch {
    // 2순위: Web API 폴백
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        const ms = style === "heavy" ? 30 : style === "medium" ? 15 : 8;
        navigator.vibrate(ms);
      }
    } catch {
      // 진동 미지원 환경 무시
    }
  }
}
