// 건강보험심사평가원 시도코드 기준 (HIRA 실제 API 응답 검증 완료)
// 2025-02-05 실제 API 호출로 sidoCd ↔ sidoCdNm 매핑 확인
// [Phase 0] 세종시 코드 수정: 410000 → 360000 (공공 API 기준)

export interface Region {
  code: string
  name: string
  slug: string
}

// 시도 코드 (17개 시도) - 실제 HIRA API 검증 완료
export const REGIONS: Record<string, Region> = {
  "seoul":    { code: "110000", name: "서울특별시",       slug: "seoul" },
  "busan":    { code: "210000", name: "부산광역시",       slug: "busan" },
  "incheon":  { code: "220000", name: "인천광역시",       slug: "incheon" },
  "daegu":    { code: "230000", name: "대구광역시",       slug: "daegu" },
  "gwangju":  { code: "240000", name: "광주광역시",       slug: "gwangju" },
  "daejeon":  { code: "250000", name: "대전광역시",       slug: "daejeon" },
  "ulsan":    { code: "260000", name: "울산광역시",       slug: "ulsan" },
  "gyeonggi": { code: "310000", name: "경기도",           slug: "gyeonggi" },
  "gangwon":  { code: "320000", name: "강원특별자치도",   slug: "gangwon" },
  "chungbuk": { code: "330000", name: "충청북도",         slug: "chungbuk" },
  "chungnam": { code: "340000", name: "충청남도",         slug: "chungnam" },
  "jeonbuk":  { code: "350000", name: "전북특별자치도",   slug: "jeonbuk" },
  "jeonnam":  { code: "360000", name: "전라남도",         slug: "jeonnam" },
  "gyeongbuk":{ code: "370000", name: "경상북도",         slug: "gyeongbuk" },
  "gyeongnam":{ code: "380000", name: "경상남도",         slug: "gyeongnam" },
  "jeju":     { code: "390000", name: "제주특별자치도",   slug: "jeju" },
  "sejong":   { code: "360000", name: "세종특별자치시",   slug: "sejong" },
}

// slug로 지역 정보 가져오기
export function getRegionBySlug(slug: string): Region | null {
  return REGIONS[slug] || null
}

// 모든 지역 목록
export function getAllRegions(): Region[] {
  return Object.values(REGIONS)
}
