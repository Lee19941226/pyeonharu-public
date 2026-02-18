/**
 * 한글 텍스트를 초성으로 변환
 * 예: "오리온 초코송이" → "ㅇㄹㅇ ㅊㅋㅅㅇ"
 */
export function getChosung(text: string): string {
  const CHO = [
    "ㄱ",
    "ㄲ",
    "ㄴ",
    "ㄷ",
    "ㄸ",
    "ㄹ",
    "ㅁ",
    "ㅂ",
    "ㅃ",
    "ㅅ",
    "ㅆ",
    "ㅇ",
    "ㅈ",
    "ㅉ",
    "ㅊ",
    "ㅋ",
    "ㅌ",
    "ㅍ",
    "ㅎ",
  ];

  return text
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);

      // 한글 범위: 0xAC00(가) ~ 0xD7A3(힣)
      if (code >= 0xac00 && code <= 0xd7a3) {
        const chosungIndex = Math.floor((code - 0xac00) / 588);
        return CHO[chosungIndex];
      }

      // 한글 아니면 그대로 (공백, 숫자, 영문 등)
      return char;
    })
    .join("");
}

/**
 * 검색어를 초성으로 변환 (공백 제거)
 * 예: "ㅊㅋㅍㅇ" → "ㅊㅋㅍㅇ"
 *     "초코파이" → "ㅊㅋㅍㅇ"
 */
export function normalizeChosungQuery(query: string): string {
  return getChosung(query).replace(/\s+/g, "");
}
