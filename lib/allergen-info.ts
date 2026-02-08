export interface AllergenInfo {
  name: string;
  symptoms: string[];
  severity: "high" | "medium" | "low";
  description: string;
}

export const ALLERGEN_DATABASE: Record<string, AllergenInfo> = {
  계란: {
    name: "계란",
    symptoms: ["피부 발진", "두드러기", "호흡곤란", "구토", "설사"],
    severity: "high",
    description:
      "가장 흔한 식품 알레르기 중 하나로, 아나필락시스를 유발할 수 있습니다",
  },
  우유: {
    name: "우유/유제품",
    symptoms: ["복통", "설사", "구토", "피부 발진", "호흡곤란"],
    severity: "high",
    description: "유당불내증과 다르며, 면역계의 과민반응으로 발생합니다",
  },
  밀: {
    name: "밀",
    symptoms: ["복부 팽만", "설사", "피부 가려움", "호흡곤란", "아나필락시스"],
    severity: "high",
    description:
      "글루텐 알레르기와 관련이 있으며, 심각한 반응을 일으킬 수 있습니다",
  },
  땅콩: {
    name: "땅콩",
    symptoms: ["아나필락시스", "호흡곤란", "혈압 저하", "의식 저하"],
    severity: "high",
    description:
      "가장 위험한 알레르기 중 하나로, 미량 섭취도 치명적일 수 있습니다",
  },
  대두: {
    name: "대두",
    symptoms: ["피부 발진", "가려움", "구토", "호흡곤란"],
    severity: "medium",
    description: "콩 알레르기는 아시아에서 흔하며, 두부·된장 등에 포함됩니다",
  },
  견과류: {
    name: "견과류",
    symptoms: ["아나필락시스", "호흡곤란", "피부 부종", "구토"],
    severity: "high",
    description: "호두·아몬드·캐슈넛 등이 포함되며, 심각한 반응을 유발합니다",
  },
  호두: {
    name: "호두",
    symptoms: ["아나필락시스", "호흡곤란", "피부 부종"],
    severity: "high",
    description: "견과류 알레르기의 가장 흔한 원인 중 하나입니다",
  },
  잣: {
    name: "잣",
    symptoms: ["입안 가려움", "호흡곤란", "피부 발진"],
    severity: "medium",
    description: "견과류 알레르기에 속하며, 한국 요리에 자주 사용됩니다",
  },
  갑각류: {
    name: "갑각류",
    symptoms: ["아나필락시스", "피부 발진", "구토", "호흡곤란"],
    severity: "high",
    description: "새우·게·랍스터 등이 포함되며, 성인에게 흔합니다",
  },
  새우: {
    name: "새우",
    symptoms: ["아나필락시스", "피부 두드러기", "호흡곤란"],
    severity: "high",
    description: "갑각류 알레르기의 가장 흔한 원인입니다",
  },
  게: {
    name: "게",
    symptoms: ["피부 발진", "호흡곤란", "구토", "설사"],
    severity: "high",
    description: "새우와 교차반응이 흔하게 나타납니다",
  },
  생선: {
    name: "생선",
    symptoms: ["구토", "설사", "피부 발진", "호흡곤란"],
    severity: "medium",
    description:
      "연어·참치·고등어 등 다양한 생선에서 반응이 나타날 수 있습니다",
  },
  조개류: {
    name: "조개류",
    symptoms: ["아나필락시스", "구토", "복통", "호흡곤란"],
    severity: "high",
    description: "굴·조개·홍합 등이 포함되며, 갑각류와 다른 알레르기입니다",
  },
  메밀: {
    name: "메밀",
    symptoms: ["아나필락시스", "호흡곤란", "피부 발진"],
    severity: "high",
    description: "일본과 한국에서 흔하며, 심각한 반응을 일으킬 수 있습니다",
  },
  복숭아: {
    name: "복숭아",
    symptoms: ["입안 가려움", "목 부종", "피부 발진", "호흡곤란"],
    severity: "medium",
    description: "꽃가루 알레르기와 교차반응을 일으킬 수 있습니다",
  },
  토마토: {
    name: "토마토",
    symptoms: ["입안 가려움", "피부 발진", "복통"],
    severity: "low",
    description: "히스타민이 풍부하여 가벼운 알레르기 반응을 일으킵니다",
  },
  돼지고기: {
    name: "돼지고기",
    symptoms: ["피부 발진", "구토", "복통", "설사"],
    severity: "medium",
    description: "육류 알레르기는 드물지만, 발생 시 주의가 필요합니다",
  },
  쇠고기: {
    name: "쇠고기",
    symptoms: ["피부 발진", "두드러기", "구토", "아나필락시스"],
    severity: "medium",
    description: "진드기 알레르기와 관련이 있을 수 있습니다",
  },
  닭고기: {
    name: "닭고기",
    symptoms: ["피부 발진", "구토", "호흡곤란"],
    severity: "medium",
    description: "계란 알레르기와 교차반응이 있을 수 있습니다",
  },
  오징어: {
    name: "오징어",
    symptoms: ["피부 발진", "구토", "호흡곤란"],
    severity: "medium",
    description: "연체동물 알레르기로, 조개류와 다릅니다",
  },
  고등어: {
    name: "고등어",
    symptoms: ["히스타민 중독", "피부 발진", "두통", "구토"],
    severity: "medium",
    description:
      "신선도가 떨어지면 히스타민이 증가하여 알레르기 반응이 심해집니다",
  },
  아황산류: {
    name: "아황산류",
    symptoms: ["천식 악화", "호흡곤란", "두드러기"],
    severity: "medium",
    description: "와인·건과일 등에 방부제로 사용되며, 천식 환자에게 위험합니다",
  },
  전복: {
    name: "전복",
    symptoms: ["피부 발진", "구토", "호흡곤란"],
    severity: "medium",
    description: "조개류 알레르기에 속하며, 고급 요리에 자주 사용됩니다",
  },
};

// 알레르기 성분 매칭 헬퍼 함수
export function getAllergenInfo(allergenName: string): AllergenInfo | null {
  // 정확한 매칭
  if (ALLERGEN_DATABASE[allergenName]) {
    return ALLERGEN_DATABASE[allergenName];
  }

  // 부분 매칭 (예: "우유" 포함 → "우유/유제품")
  for (const [key, value] of Object.entries(ALLERGEN_DATABASE)) {
    if (allergenName.includes(key) || key.includes(allergenName)) {
      return value;
    }
  }

  return null;
}
