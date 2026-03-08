// 편하루 고등학교: 비로그인/학교 미등록 사용자용 가상 학교
export const PYEONHARU_SCHOOL = {
  schoolCode: "PYEONHARU",
  officeCode: "PYEONHARU",
  schoolName: "편하루 고등학교",
} as const;

// 실제 학교 목록 — 날짜 기반 로테이션으로 NEIS 급식 데이터를 가져옴
// 관리자가 실제 운영 중인 학교 코드로 교체 가능
const SAMPLE_SCHOOLS = [
  { schoolCode: "7010536", officeCode: "B10" }, // 서울
  { schoolCode: "7010057", officeCode: "B10" }, // 서울
  { schoolCode: "7010178", officeCode: "B10" }, // 서울
  { schoolCode: "7010085", officeCode: "B10" }, // 서울
  { schoolCode: "7530072", officeCode: "J10" }, // 경기
  { schoolCode: "7240454", officeCode: "G10" }, // 대전
  { schoolCode: "7380292", officeCode: "E10" }, // 인천
];

/**
 * 날짜 기반으로 실제 학교 선택 (같은 날에는 항상 같은 학교)
 * @param date YYYYMMDD 형식
 */
export function getSchoolForDate(date: string) {
  const num = parseInt(date, 10) || 0;
  const idx = num % SAMPLE_SCHOOLS.length;
  return SAMPLE_SCHOOLS[idx];
}

export function isPyeonharuSchool(schoolCode: string, officeCode: string) {
  return (
    schoolCode === PYEONHARU_SCHOOL.schoolCode &&
    officeCode === PYEONHARU_SCHOOL.officeCode
  );
}
