/**
 * 한글 자모 분해 및 오타 유사도 검색 유틸리티
 */

// 초성 19자 (가나다 순)
const CHOSUNGS = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ",
  "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

// 중성 21자
const JUNGSUNGS = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ",
  "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
] as const;

// 종성 28자 (인덱스 0 = 받침 없음)
const JONGSUNGS = [
  "",   "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ",
  "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ",
  "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ",
  "ㅋ", "ㅌ", "ㅍ", "ㅎ",
] as const;

const HANGUL_START = 0xAC00;
const HANGUL_END   = 0xD7A3;

// ─────────────────────────────────────────────────────────
// 1. 자모 분해
// ─────────────────────────────────────────────────────────

/**
 * 한글 문자열을 초성·중성·종성 자모 배열로 분해한다.
 * 비한글 문자(영문, 숫자, 기호)는 그대로 포함된다.
 *
 * @example
 * decomposeJamo("계란") // → ["ㄱ", "ㅖ", "ㄹ", "ㅏ", "ㄴ"]
 * decomposeJamo("닭기") // → ["ㄷ", "ㅏ", "ㄱ", "ㄱ", "ㅣ"]
 */
export function decomposeJamo(str: string): string[] {
  const result: string[] = [];

  for (const char of str) {
    const code = char.charCodeAt(0);

    if (code >= HANGUL_START && code <= HANGUL_END) {
      const offset      = code - HANGUL_START;
      const jongsungIdx = offset % 28;
      const jungsung    = JUNGSUNGS[Math.floor((offset / 28) % 21)];
      const chosung     = CHOSUNGS[Math.floor(offset / (21 * 28))];

      result.push(chosung, jungsung);
      if (jongsungIdx > 0) result.push(JONGSUNGS[jongsungIdx]);
    } else {
      // 이미 낱자(ㄱ, ㅏ …)이거나 비한글 문자이면 그대로 추가
      result.push(char);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────
// 2. 자모 유사도 계산
// ─────────────────────────────────────────────────────────

/** O(n) 공간 레벤슈타인 편집 거리 */
function levenshtein(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;

  // prev[j] = dp[i-1][j]
  let prev = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    const curr = new Array<number>(n + 1);
    curr[0] = i;

    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }

    prev = curr;
  }

  return prev[n];
}

/**
 * 두 한글 문자열 간 자모 기반 유사도를 0~1 사이 점수로 반환한다.
 * 1에 가까울수록 유사하고, 완전히 동일하면 1을 반환한다.
 *
 * @example
 * jamoSimilarity("겨란", "계란") // → ~0.83
 * jamoSimilarity("밀까루", "밀가루") // → ~0.88
 * jamoSimilarity("사과", "배")   // → ~0.17
 */
export function jamoSimilarity(a: string, b: string): number {
  if (a === b) return 1;

  const jamoA = decomposeJamo(a);
  const jamoB = decomposeJamo(b);

  if (jamoA.length === 0 && jamoB.length === 0) return 1;
  if (jamoA.length === 0 || jamoB.length === 0) return 0;

  const distance = levenshtein(jamoA, jamoB);
  const maxLen   = Math.max(jamoA.length, jamoB.length);

  return 1 - distance / maxLen;
}

// ─────────────────────────────────────────────────────────
// 3. 후보 단어 중 최적 매칭
// ─────────────────────────────────────────────────────────

/**
 * 후보 단어 배열에서 입력값과 가장 유사한 단어를 반환한다.
 * 최고 유사도가 threshold 미만이면 null을 반환한다.
 *
 * @param input      사용자 입력값
 * @param candidates 비교할 후보 단어 배열
 * @param threshold  반환 최소 유사도 (기본 0.7)
 *
 * @example
 * findBestMatch("겨란", ["계란", "달걀", "메추리알"])
 * // → { word: "계란", score: 0.83 }
 *
 * findBestMatch("사과", ["배", "귤", "딸기"])
 * // → null  (모두 0.7 미만)
 */
export function findBestMatch(
  input: string,
  candidates: string[],
  threshold = 0.7,
): { word: string; score: number } | null {
  let bestWord  = "";
  let bestScore = 0;

  for (const candidate of candidates) {
    const score = jamoSimilarity(input, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestWord  = candidate;
    }
  }

  return bestScore >= threshold ? { word: bestWord, score: bestScore } : null;
}

// ─────────────────────────────────────────────────────────
// 4. 식품 관련 오타 사전
// ─────────────────────────────────────────────────────────

/**
 * 자주 쓰이는 식품 관련 오타 사전
 * key: 잘못 입력된 표현 / value: 올바른 표현
 *
 * 오타 유형:
 *   - 격음/경음 혼동  (ㄱ↔ㄲ, ㅈ↔ㅉ, ...)
 *   - 유사 모음 혼동  (ㅖ↔ㅔ, ㅡ↔ㅗ, ...)
 *   - 발음대로 쓰기   (계→게, 탕→당, ...)
 *   - 생략·축약       (고기→기)
 *   - 외래어 표기 혼동 (드→두, 트→티, ...)
 */
export const FOOD_TYPO_DICT: Record<string, string> = {
  // ── 달걀 / 계란 ──────────────────────────────────────
  겨란:   "계란",   // ㅕ ↔ ㅖ 모음 혼동
  게란:   "계란",   // 게 ↔ 계 경음 혼동
  껴란:   "계란",   // 경음화

  // ── 곡물 / 분말 ──────────────────────────────────────
  밀까루: "밀가루", // ㄱ ↔ ㄲ 경음 혼동
  밀가리: "밀가루", // ㅣ ↔ ㅜ 모음 혼동
  밀까리: "밀가루", // 경음 + 모음 복합 오타

  // ── 견과류 ───────────────────────────────────────────
  땅꽁:   "땅콩",   // ㄱ 경음화 + ㅇ ↔ ㄱ
  아몬두: "아몬드", // 드 ↔ 두 모음 혼동
  캐슈낫: "캐슈넛", // 낫 ↔ 넛 모음 혼동

  // ── 채소 ─────────────────────────────────────────────
  당군:     "당근", // ㅜ ↔ ㅡ 모음 혼동
  당그:     "당근", // 받침 탈락
  감쟈:     "감자", // ㅈ ↔ ㅉ 경음 혼동
  토마도:   "토마토", // 마지막 음절 혼동
  브로컬리: "브로콜리", // 컬 ↔ 콜 모음 혼동
  브로꼴리: "브로콜리", // ㅋ ↔ ㄲ 경음 혼동

  // ── 콩류 ─────────────────────────────────────────────
  완두공:   "완두콩", // 공 ↔ 콩 초성 혼동
  강낭공:   "강낭콩", // 공 ↔ 콩 초성 혼동
  녀두:     "녹두",   // ㅕ ↔ ㅗ + 받침 탈락

  // ── 육류 ─────────────────────────────────────────────
  돼지기:   "돼지고기", // 고기 → 기 생략
  쇠기:     "쇠고기",   // 고기 → 기 생략
  닭기:     "닭고기",   // 고기 → 기 생략

  // ── 두부 ─────────────────────────────────────────────
  뚜부:   "두부",   // ㄷ ↔ ㄸ 경음 혼동
  연뚜부: "연두부", // ㄷ ↔ ㄸ 경음 혼동

  // ── 기본 조미료 ──────────────────────────────────────
  소곰:     "소금",   // ㅗ ↔ ㅡ 모음 혼동
  설당:     "설탕",   // 당 ↔ 탕 초성 혼동
  간쟝:     "간장",   // ㅈ ↔ ㅉ 경음 혼동
  고추짱:   "고추장", // ㅈ ↔ ㅉ 경음 혼동
  된쟝:     "된장",   // ㅈ ↔ ㅉ 경음 혼동
  후쭈:     "후추",   // ㅈ ↔ ㅉ 경음 혼동
  마눌:     "마늘",   // ㄴ ↔ ㄹ + ㅜ ↔ ㅡ 혼동

  // ── 소스 / 드레싱 ─────────────────────────────────────
  마요내즈: "마요네즈", // 내 ↔ 네 모음 혼동
  마요네스: "마요네즈", // 어말 스 ↔ 즈 혼동
  케찹:     "케첩",     // 찹 ↔ 첩 모음 혼동

  // ── 유제품 ───────────────────────────────────────────
  버티: "버터", // ㅣ ↔ ㅓ 모음 혼동

  // ── 기타 ─────────────────────────────────────────────
  노란자:   "노른자", // 란 ↔ 른 모음 혼동 (달걀 노른자)
  올리이브: "올리브", // 이중 모음 삽입 오타
};

// ─────────────────────────────────────────────────────────
// 보너스: 사전 + 유사도를 결합한 오타 교정 함수
// ─────────────────────────────────────────────────────────

/**
 * 식품명 오타를 교정한다.
 * 1순위: FOOD_TYPO_DICT 직접 조회
 * 2순위: 사전 키와의 자모 유사도 검색 (threshold 0.8)
 *
 * @returns 교정된 단어, 없으면 null
 *
 * @example
 * correctFoodTypo("겨란")   // → "계란"
 * correctFoodTypo("땅꽁")   // → "땅콩"
 * correctFoodTypo("사과")   // → null (오타 아님)
 */
export function correctFoodTypo(input: string): string | null {
  // 1. 사전 직접 조회
  const direct = FOOD_TYPO_DICT[input];
  if (direct) return direct;

  // 2. 유사도 기반 사전 키 검색 (threshold를 높게 설정해 오탐 방지)
  const match = findBestMatch(input, Object.keys(FOOD_TYPO_DICT), 0.8);
  if (match) return FOOD_TYPO_DICT[match.word];

  return null;
}
