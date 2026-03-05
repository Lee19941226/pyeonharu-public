import { getChosung } from "./chosung";

// ── HTML 태그 제거 (XSS 방어) ──
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").trim();
}

// ── 한국어 비속어 사전 ──
const PROFANITY_LIST: string[] = [
  // 일반 욕설
  "시발", "씨발", "시바", "씨바", "씨빨", "시빨",
  "시팔", "씨팔", "씨불", "시불",
  "개새끼", "개새기", "개세끼", "개세기",
  "병신", "병싄", "병쉰", "븅신",
  "지랄", "지럴", "짓랄",
  "미친놈", "미친년", "미친새끼",
  "존나", "졸라", "존내", "좆나",
  "좆", "자지", "보지",
  "꺼져", "닥쳐", "뒤져", "뒤져라", "죽어", "죽어라",
  "새끼", "새기", "쌔끼", "쌔기",
  "놈", "년",
  "개같은", "개같이",
  "ㅅㅂ", "ㅂㅅ", "ㅈㄹ", "ㅁㅊ", "ㅄ", "ㅗ",
  "개소리", "헛소리",
  "쓰레기", "찐따", "찐다",
  "한남", "한녀",
  "느금마", "느금",
  "엠창", "애미", "애비",
  "등신", "멍청이",
  // 성적 비하
  "강간", "성폭행",
  // 차별·혐오
  "장애인놈", "장애인년",
];

// 초성 비속어 패턴 (초성만으로 이루어진 욕설)
const CHOSUNG_PROFANITY: string[] = [
  "ㅅㅂ", "ㅂㅅ", "ㅈㄹ", "ㅁㅊ", "ㅄ",
  "ㅆㅂ", "ㅅㅂㄹㅁ", "ㅈㄴ",
];

// 특수문자·공백 삽입 우회 패턴 대응용 정규식 생성
function buildPattern(word: string): RegExp {
  // 각 글자 사이에 공백/특수문자 0~2개 허용
  const separator = "[\\s~!@#$%^&*()_\\-+=.,;:'\"`\\[\\]{}|<>?\\/\\\\]{0,2}";
  const escaped = word
    .split("")
    .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(separator);
  return new RegExp(escaped, "gi");
}

// 비속어 정규식 캐시 (모듈 로드 시 1회 생성)
const PATTERNS: RegExp[] = PROFANITY_LIST.map(buildPattern);

/**
 * 텍스트 내 비속어를 같은 길이의 `*`로 마스킹
 */
export function maskProfanity(text: string): string {
  let result = text;

  // 1) 일반 비속어 + 우회 패턴 매칭
  for (const pattern of PATTERNS) {
    result = result.replace(pattern, (match) => "*".repeat(match.length));
  }

  // 2) 초성 욕설 매칭 — 텍스트를 초성 변환 후 위치 매핑
  const chosung = getChosung(result);
  for (const cp of CHOSUNG_PROFANITY) {
    let idx = 0;
    while (true) {
      const pos = chosung.indexOf(cp, idx);
      if (pos === -1) break;

      // 해당 위치의 원문이 이미 초성(자음)인 경우만 마스킹
      // (완성된 한글이 초성으로 변환된 것이면 오탐 가능성 높음)
      const slice = result.slice(pos, pos + cp.length);
      const isAllJamo = /^[ㄱ-ㅎ]+$/.test(slice);

      if (isAllJamo) {
        result =
          result.slice(0, pos) +
          "*".repeat(cp.length) +
          result.slice(pos + cp.length);
      }
      idx = pos + cp.length;
    }
  }

  return result;
}
