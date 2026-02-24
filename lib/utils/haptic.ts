/**
 * 모바일 햅틱 피드백 (진동)
 * - Android Chrome / WebView: navigator.vibrate() 지원
 * - iOS Safari: 미지원 (무시됨)
 */

type HapticStyle = "light" | "medium" | "heavy";

const VIBRATION_MS: Record<HapticStyle, number> = {
  light: 8,
  medium: 15,
  heavy: 30,
};

export function haptic(style: HapticStyle = "light") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(VIBRATION_MS[style]);
    }
  } catch {
    // 진동 미지원 환경 무시
  }
}
