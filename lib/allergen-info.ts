// ==========================================
// 간단한 알레르기 정보 (기존 호환성 유지)
// ==========================================
export interface AllergenInfo {
  name: string;
  symptoms: string[];
  severity: "high" | "medium" | "low";
  description: string;
}
// ==========================================
// 상세 알레르기 정보 (모달용)
// ==========================================
export interface DetailedAllergenInfo {
  code: string;
  name: string;
  emoji: string;
  scientificName: string;
  category:
    | "곡물"
    | "유제품·계란"
    | "갑각류·어패류"
    | "견과류"
    | "과일·채소"
    | "육류"
    | "기타";
  severity: "high" | "medium" | "low";
  description: string;

  symptoms: {
    mild: string[];
    moderate: string[];
    severe: string[];
  };

  crossReactivity: string[];
  commonFoods: string[];
  hiddenSources: string[];
  management: string[];

  emergencyInfo: {
    signs: string[];
    actions: string[];
  };

  diagnosis: string;
  prevalence: string;
  prognosis: string;
}

// ==========================================
// 간단한 알레르기 데이터베이스 (기존 호환성)
// ==========================================
export const ALLERGEN_DATABASE: Record<string, AllergenInfo> = {
  계란: {
    name: "계란",
    symptoms: ["피부 발진", "두드러기", "호흡곤란", "구토", "설사"],
    severity: "high",
    description:
      "가장 흔한 식품 알레르기 중 하나로, 아나필락시스를 유발할 수 있습니다",
  },
  우유: {
    name: "우유",
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
    symptoms: ["아나필락시스", "피부 두드러기", "호흡곤란", "구토"],
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
  참깨: {
    name: "참깨",
    symptoms: ["아나필락시스", "두드러기", "호흡곤란"],
    severity: "medium",
    description: "한국 음식에 흔히 사용되는 재료로 알레르기가 증가 추세입니다",
  },
};

// ==========================================
// 상세 알레르기 데이터베이스 (모달용)
// ==========================================
export const DETAILED_ALLERGEN_DATABASE: Record<string, DetailedAllergenInfo> =
  {
    shrimp: {
      code: "shrimp",
      name: "새우",
      emoji: "🦐",
      scientificName: "Crustacean (갑각류)",
      category: "갑각류·어패류",
      severity: "high",
      description:
        "성인에게 가장 흔한 식품 알레르기 중 하나로, 평생 지속되는 경향이 있습니다.",

      symptoms: {
        mild: ["입안 가려움", "입술 붓기", "피부 가려움"],
        moderate: ["두드러기", "구토", "복통", "설사"],
        severe: ["호흡곤란", "혈압 저하", "의식 저하", "아나필락시스"],
      },

      crossReactivity: ["게", "랍스터", "가재", "바닷가재", "크릴"],

      commonFoods: [
        "새우튀김",
        "새우깡",
        "새우젓",
        "월남쌈",
        "팟타이",
        "새우볶음밥",
        "칵테일새우",
        "새우만두",
        "해물찜",
        "해물파전",
      ],

      hiddenSources: [
        "크릴 오일",
        "키토산",
        "글루코사민",
        "새우 추출물",
        "해산물 맛 과자",
        "XO소스",
        "해물 육수",
        "우스터소스",
      ],

      management: [
        "모든 갑각류 음식 완전 회피",
        "아시아 요리점에서 특히 주의 (교차오염 위험)",
        "레스토랑 방문 시 주방에 알레르기 알리기",
        "에피네프린 자가주사기 항상 휴대",
        "성분표에서 '갑각류' 표시 확인",
      ],

      emergencyInfo: {
        signs: [
          "입술/혀/목구멍 심한 부종",
          "호흡곤란, 쌕쌕거림",
          "현기증, 의식 저하",
          "급격한 혈압 저하",
          "전신 두드러기",
        ],
        actions: [
          "즉시 119 신고",
          "에피네프린 자가주사기 허벅지에 투여",
          "눕혀서 다리를 높게 올림",
          "구토 시 옆으로 눕힘",
          "병원 도착까지 계속 관찰",
        ],
      },

      diagnosis: "혈액 검사(특이 IgE), 피부단자검사로 진단합니다.",
      prevalence: "성인의 약 2-3%",
      prognosis: "대부분 평생 지속",
    },

    crab: {
      code: "crab",
      name: "게",
      emoji: "🦀",
      scientificName: "Crab",
      category: "갑각류·어패류",
      severity: "high",
      description: "새우 알레르기와 높은 교차반응성을 보입니다.",

      symptoms: {
        mild: ["피부 발진", "입안 간지러움"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["새우", "랍스터", "가재"],
      commonFoods: ["간장게장", "양념게장", "게살", "게튀김"],
      hiddenSources: ["해물 육수", "게 추출물"],

      management: ["모든 갑각류 회피", "에피네프린 휴대"],

      emergencyInfo: {
        signs: ["급격한 부종", "호흡곤란"],
        actions: ["즉시 119 신고", "에피네프린 투여"],
      },

      diagnosis: "혈액 검사, 피부단자검사",
      prevalence: "갑각류 알레르기 환자의 80% 이상",
      prognosis: "평생 지속되는 경향",
    },

    peanut: {
      code: "peanut",
      name: "땅콩",
      emoji: "🥜",
      scientificName: "Arachis hypogaea",
      category: "견과류",
      severity: "high",
      description:
        "가장 위험한 식품 알레르기 중 하나로, 미량 섭취로도 심각한 아나필락시스를 유발할 수 있습니다.",

      symptoms: {
        mild: ["입안 간지러움", "피부 발진"],
        moderate: ["두드러기", "구토", "복통", "설사"],
        severe: [
          "목구멍 부종",
          "심한 호흡곤란",
          "급격한 혈압 저하",
          "의식 소실",
          "아나필락시스",
        ],
      },

      crossReactivity: ["대두", "루핀", "기타 콩류"],

      commonFoods: [
        "땅콩버터",
        "땅콩과자",
        "초콜릿(일부)",
        "쿠키",
        "태국 요리",
        "인도네시아 요리",
      ],

      hiddenSources: ["아라키돈산", "식물성 단백질", "땅콩 오일"],

      management: [
        "모든 땅콩 제품 완전 회피",
        "에피네프린 자가주사기 2개 이상 휴대",
        "외식 시 반드시 알리기",
      ],

      emergencyInfo: {
        signs: [
          "혀/목구멍 급격한 부종",
          "목소리 변화",
          "쌕쌕거림, 호흡곤란",
          "의식 혼미",
        ],
        actions: [
          "즉시 119 신고",
          "에피네프린 자가주사기를 허벅지에 투여",
          "환자를 눕히고 다리를 높게 올림",
          "5-15분 후에도 증상 지속 시 2차 투여",
        ],
      },

      diagnosis: "혈액 검사, 피부단자검사",
      prevalence: "어린이의 1-2%, 성인의 0.5-1%",
      prognosis: "약 20%는 성장하면서 극복, 80%는 평생 지속",
    },

    walnut: {
      code: "walnut",
      name: "호두",
      emoji: "🌰",
      scientificName: "Juglans regia",
      category: "견과류",
      severity: "high",
      description: "견과류 알레르기 중 가장 흔한 종류입니다.",

      symptoms: {
        mild: ["구강 가려움", "입술 붓기"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["피칸", "캐슈넛", "아몬드", "마카다미아"],
      commonFoods: ["호두과자", "호두파이", "브라우니"],
      hiddenSources: ["견과류 향", "베이커리 제품"],

      management: ["모든 견과류 제품 회피 권장", "에피네프린 휴대"],

      emergencyInfo: {
        signs: ["심한 부종", "호흡곤란"],
        actions: ["에피네프린 투여", "119 신고"],
      },

      diagnosis: "특이 IgE 혈액검사",
      prevalence: "견과류 알레르기 환자의 30-40%",
      prognosis: "대부분 평생 지속",
    },

    milk: {
      code: "milk",
      name: "우유",
      emoji: "🥛",
      scientificName: "Cow's Milk Protein",
      category: "유제품·계란",
      severity: "high",
      description: "영유아기에 가장 흔한 식품 알레르기입니다.",

      symptoms: {
        mild: ["피부 발진", "입 주변 붓기"],
        moderate: ["구토", "설사", "혈변"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["염소젖", "양젖"],
      commonFoods: ["우유", "치즈", "버터", "요구르트"],
      hiddenSources: ["유청", "카제인", "유당"],

      management: [
        "모든 유제품 완전 회피",
        "두유, 아몬드유로 대체",
        "칼슘 보충",
      ],

      emergencyInfo: {
        signs: ["급격한 부종", "호흡곤란"],
        actions: ["에피네프린 투여", "119 신고"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "영아의 2-3%",
      prognosis: "5세까지 80-90% 자연 관해",
    },

    egg: {
      code: "egg",
      name: "계란",
      emoji: "🥚",
      scientificName: "Chicken Egg",
      category: "유제품·계란",
      severity: "high",
      description:
        "흰자에 주로 알레르겐이 있으며, 가열하면 반응이 줄어들 수 있습니다.",

      symptoms: {
        mild: ["피부 발진", "두드러기"],
        moderate: ["구토", "복통", "설사"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["오리알", "메추리알"],
      commonFoods: ["계란", "마요네즈", "빵", "케이크"],
      hiddenSources: ["알부민", "레시틴", "난백"],

      management: [
        "생계란, 반숙란 완전 회피",
        "완전히 익힌 계란은 섭취 가능할 수 있음",
      ],

      emergencyInfo: {
        signs: ["심한 발진", "호흡곤란"],
        actions: ["에피네프린 투여"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "영유아의 1-2%",
      prognosis: "80%는 학령기에 호전",
    },

    wheat: {
      code: "wheat",
      name: "밀",
      emoji: "🌾",
      scientificName: "Triticum aestivum",
      category: "곡물",
      severity: "medium",
      description: "빵, 파스타 등 다양한 식품에 사용됩니다.",

      symptoms: {
        mild: ["피부 가려움", "구강 불편감"],
        moderate: ["두드러기", "소화불량", "복통"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["보리", "호밀"],
      commonFoods: ["빵", "파스타", "국수", "라면"],
      hiddenSources: ["글루텐", "세몰리나", "밀전분"],

      management: ["모든 밀 제품 회피", "쌀가루, 감자전분으로 대체"],

      emergencyInfo: {
        signs: ["운동 후 아나필락시스"],
        actions: ["운동 중단", "에피네프린 투여"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "어린이의 0.5-1%",
      prognosis: "80% 이상이 학령기에 극복",
    },
    crustacean: {
      code: "crustacean",
      name: "갑각류",
      emoji: "🦞",
      scientificName: "Crustacea",
      category: "갑각류·어패류",
      severity: "high",
      description: "새우, 게, 랍스터 등 갑각류 전체를 포함하는 알레르기입니다.",

      symptoms: {
        mild: ["입안 가려움", "입술 붓기", "피부 가려움"],
        moderate: ["두드러기", "구토", "복통", "설사"],
        severe: ["아나필락시스", "호흡곤란", "혈압 저하", "의식 저하"],
      },

      crossReactivity: ["새우", "게", "랍스터", "가재", "바닷가재", "크릴"],

      commonFoods: [
        "새우",
        "게",
        "랍스터",
        "가재",
        "새우튀김",
        "게장",
        "해물탕",
        "해물파전",
        "새우깡",
        "새우젓",
      ],

      hiddenSources: [
        "크릴 오일",
        "키토산",
        "글루코사민",
        "해산물 맛 과자",
        "XO소스",
        "해물 육수",
      ],

      management: [
        "모든 갑각류 음식 완전 회피",
        "해산물 레스토랑에서 교차오염 주의",
        "에피네프린 자가주사기 항상 휴대",
        "성분표에서 '갑각류' 표시 확인",
      ],

      emergencyInfo: {
        signs: [
          "입술/혀/목구멍 심한 부종",
          "호흡곤란, 쌕쌕거림",
          "현기증, 의식 저하",
          "급격한 혈압 저하",
          "전신 두드러기",
        ],
        actions: [
          "즉시 119 신고",
          "에피네프린 자가주사기 허벅지에 투여",
          "환자를 눕히고 다리를 높게 올림",
          "구토 시 옆으로 눕힘",
          "병원 도착까지 계속 관찰",
        ],
      },

      diagnosis: "혈액 검사(특이 IgE), 피부단자검사로 진단합니다.",
      prevalence: "성인의 약 2-3%, 가장 흔한 식품 알레르기 중 하나",
      prognosis: "대부분 평생 지속되며 자연 관해는 매우 드뭅니다",
    },

    fish: {
      code: "fish",
      name: "생선",
      emoji: "🐟",
      scientificName: "Fish",
      category: "갑각류·어패류",
      severity: "medium",
      description:
        "연어, 참치, 고등어 등 다양한 생선에서 반응이 나타날 수 있습니다.",

      symptoms: {
        mild: ["입안 가려움", "피부 발진", "두드러기"],
        moderate: ["구토", "설사", "복통", "피부 부종"],
        severe: ["호흡곤란", "아나필락시스(드물게)"],
      },

      crossReactivity: [
        "고등어",
        "연어",
        "참치",
        "명태",
        "대구",
        "삼치",
        "조기",
        "갈치",
      ],

      commonFoods: [
        "회",
        "초밥",
        "구이",
        "조림",
        "찌개",
        "생선가스",
        "어묵",
        "맛살",
        "통조림",
      ],

      hiddenSources: [
        "생선 육수",
        "피시 소스",
        "멸치 다시다",
        "오메가3 보충제(생선 유래)",
        "어묵",
        "맛살",
      ],

      management: [
        "모든 생선 회피 또는 특정 생선만 회피",
        "알레르기 유발 생선 종류 파악 필요",
        "어묵, 맛살 등 가공품 주의",
        "생선 기름 보충제 확인",
      ],

      emergencyInfo: {
        signs: ["구강 부종", "호흡곤란", "전신 두드러기", "복통, 구토"],
        actions: [
          "항히스타민제 복용",
          "증상 심하면 에피네프린 투여",
          "119 신고",
          "병원 방문",
        ],
      },

      diagnosis: "특이 IgE 검사, 피부단자검사. 생선 종류별 검사 가능",
      prevalence: "성인의 약 0.5-1%, 어린이는 더 드묾",
      prognosis: "일부는 특정 생선만 알레르기 반응. 평생 지속 가능",
    },

    abalone: {
      code: "abalone",
      name: "전복",
      emoji: "🐚",
      scientificName: "Haliotis discus hannai",
      category: "갑각류·어패류",
      severity: "medium",
      description: "조개류 알레르기에 속하며, 고급 요리에 자주 사용됩니다.",

      symptoms: {
        mild: ["입안 가려움", "피부 발진"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["굴", "조개", "홍합", "바지락", "소라"],

      commonFoods: [
        "전복죽",
        "전복구이",
        "전복회",
        "전복버터구이",
        "전복찜",
        "해물탕",
        "해산물 요리",
      ],

      hiddenSources: ["해물 육수", "조개 추출물", "해산물 소스", "고급 요리"],

      management: [
        "모든 조개류 회피 권장",
        "해산물 레스토랑 주의",
        "교차오염 가능성 확인",
      ],

      emergencyInfo: {
        signs: ["구강 부종", "호흡곤란", "두드러기", "복통"],
        actions: ["항히스타민제 복용", "증상 심하면 에피네프린", "병원 방문"],
      },

      diagnosis: "특이 IgE 검사, 피부단자검사",
      prevalence: "조개류 알레르기 환자 중 일부",
      prognosis: "조개류 알레르기는 대부분 평생 지속",
    },
    buckwheat: {
      code: "buckwheat",
      name: "메밀",
      emoji: "🍜",
      scientificName: "Fagopyrum esculentum",
      category: "곡물",
      severity: "high",
      description:
        "일본과 한국에서 흔하며, 심각한 아나필락시스를 유발할 수 있습니다.",

      symptoms: {
        mild: ["입안 가려움", "피부 발진"],
        moderate: ["두드러기", "구토", "복통", "설사"],
        severe: ["호흡곤란", "혈압 저하", "아나필락시스", "의식 소실"],
      },

      crossReactivity: ["라텍스", "쌀", "키위"],

      commonFoods: [
        "메밀국수",
        "소바",
        "메밀전병",
        "메밀차",
        "메밀묵",
        "메밀빵",
        "메밀쿠키",
      ],

      hiddenSources: ["메밀가루", "소바가루", "혼합 곡물가루"],

      management: [
        "모든 메밀 제품 완전 회피",
        "일식당 방문 시 주의",
        "에피네프린 자가주사기 휴대",
        "성분표 확인 필수",
      ],

      emergencyInfo: {
        signs: ["급격한 호흡곤란", "전신 두드러기", "혈압 급락", "의식 저하"],
        actions: [
          "즉시 119 신고",
          "에피네프린 즉시 투여",
          "환자를 눕히고 다리 올림",
          "응급실 이송",
        ],
      },

      diagnosis: "특이 IgE 혈액검사, 피부단자검사",
      prevalence: "일본·한국에서 0.2-0.5%",
      prognosis: "평생 지속되며 자연 관해 드뭄",
    },

    pine_nut: {
      code: "pine_nut",
      name: "잣",
      emoji: "🌲",
      scientificName: "Pinus koraiensis",
      category: "견과류",
      severity: "medium",
      description:
        "한국 요리에 자주 사용되는 견과류로, 비교적 경미한 반응을 보입니다.",

      symptoms: {
        mild: ["입안 가려움", "입술 붓기"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스(드물게)"],
      },

      crossReactivity: ["기타 견과류", "소나무 꽃가루"],

      commonFoods: [
        "잣죽",
        "잣국수",
        "잣강정",
        "송편",
        "잣가루",
        "잣소스",
        "페스토",
      ],

      hiddenSources: ["견과류 믹스", "혼합 견과류 오일"],

      management: [
        "잣 함유 제품 회피",
        "한식 요리 시 성분 확인",
        "견과류 알레르기 있으면 함께 회피 권장",
      ],

      emergencyInfo: {
        signs: ["심한 구강 부종", "호흡곤란"],
        actions: ["항히스타민제 복용", "증상 심하면 에피네프린"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "견과류 알레르기 중 비교적 드묾",
      prognosis: "평생 지속 가능성 높음",
    },

    tree_nuts: {
      code: "tree_nuts",
      name: "기타 견과류",
      emoji: "🥥",
      scientificName: "Tree Nuts (Multiple species)",
      category: "견과류",
      severity: "high",
      description:
        "아몬드, 캐슈넛, 피스타치오, 마카다미아 등 다양한 견과류를 포함합니다.",

      symptoms: {
        mild: ["입안 간지러움", "피부 가려움"],
        moderate: ["두드러기", "구토", "설사"],
        severe: ["아나필락시스", "호흡곤란", "의식 저하"],
      },

      crossReactivity: ["호두", "땅콩(5-10%)", "피칸"],

      commonFoods: [
        "아몬드 우유",
        "캐슈넛 버터",
        "피스타치오 아이스크림",
        "마카다미아 쿠키",
        "견과류 그래놀라",
        "혼합 견과",
      ],

      hiddenSources: ["견과류 오일", "천연 향료", "마지팬", "누가", "프랄린"],

      management: [
        "모든 견과류 제품 회피",
        "베이커리 제품 주의",
        "에피네프린 항상 휴대",
        "외식 시 주방에 알리기",
      ],

      emergencyInfo: {
        signs: ["급격한 목 부종", "쌕쌕거림", "혈압 저하", "의식 혼미"],
        actions: [
          "즉시 에피네프린 투여",
          "119 신고",
          "눕혀서 다리 올림",
          "응급실 이송",
        ],
      },

      diagnosis: "특이 IgE 혈액검사 (각 견과류별)",
      prevalence: "어린이의 1-2%, 성인의 0.5-1%",
      prognosis: "약 10%만 극복, 대부분 평생 지속",
    },

    mackerel: {
      code: "mackerel",
      name: "고등어",
      emoji: "🐟",
      scientificName: "Scomber japonicus",
      category: "갑각류·어패류",
      severity: "medium",
      description:
        "신선도가 떨어지면 히스타민이 증가하여 알레르기 반응이 심해집니다.",

      symptoms: {
        mild: ["피부 발진", "입안 간지러움"],
        moderate: ["두통", "구토", "설사", "복통"],
        severe: ["호흡곤란", "심한 두드러기"],
      },

      crossReactivity: ["참치", "연어", "기타 등푸른생선"],

      commonFoods: [
        "고등어구이",
        "고등어조림",
        "고등어찌개",
        "간고등어",
        "고등어캔",
      ],

      hiddenSources: ["생선 육수", "어묵", "맛살(일부)"],

      management: ["신선한 생선만 섭취", "의심되면 회피", "항히스타민제 비치"],

      emergencyInfo: {
        signs: ["전신 두드러기", "호흡곤란"],
        actions: ["항히스타민제 복용", "증상 심하면 병원 방문"],
      },

      diagnosis: "특이 IgE 검사, 히스타민 중독과 구별 필요",
      prevalence: "생선 알레르기 중 흔함",
      prognosis: "히스타민 중독은 회복 가능, 진성 알레르기는 지속",
    },

    squid: {
      code: "squid",
      name: "오징어",
      emoji: "🦑",
      scientificName: "Todarodes pacificus",
      category: "갑각류·어패류",
      severity: "medium",
      description: "연체동물 알레르기로, 갑각류와는 다른 알레르기입니다.",

      symptoms: {
        mild: ["피부 가려움", "입술 붓기"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["문어", "낙지", "주꾸미"],

      commonFoods: [
        "오징어볶음",
        "오징어튀김",
        "마른오징어",
        "오징어젓",
        "해물파전",
        "오징어순대",
      ],

      hiddenSources: ["해물 육수", "어묵", "해산물 맛 과자"],

      management: ["모든 연체동물 회피", "해물요리 주의", "성분표 확인"],

      emergencyInfo: {
        signs: ["급격한 부종", "호흡곤란"],
        actions: ["에피네프린 투여", "119 신고"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "연체동물 알레르기는 비교적 드묾",
      prognosis: "평생 지속 가능성",
    },

    shellfish: {
      code: "shellfish",
      name: "조개류",
      emoji: "🦪",
      scientificName: "Mollusks (Bivalves)",
      category: "갑각류·어패류",
      severity: "high",
      description: "굴, 전복, 홍합, 바지락 등 이매패류 알레르기입니다.",

      symptoms: {
        mild: ["입안 가려움", "피부 발진"],
        moderate: ["구토", "복통", "설사", "두드러기"],
        severe: ["아나필락시스", "호흡곤란", "혈압 저하"],
      },

      crossReactivity: ["굴", "전복", "홍합", "바지락", "모시조개"],

      commonFoods: [
        "굴구이",
        "전복죽",
        "홍합탕",
        "바지락국",
        "조개찜",
        "해물탕",
        "해산물 요리",
      ],

      hiddenSources: [
        "해물 육수",
        "조개 추출물",
        "오이스터 소스",
        "조개 다시다",
      ],

      management: [
        "모든 조개류 완전 회피",
        "해산물 레스토랑 주의",
        "에피네프린 휴대",
        "교차오염 주의",
      ],

      emergencyInfo: {
        signs: ["급격한 목 부종", "호흡곤란", "전신 두드러기", "혈압 저하"],
        actions: [
          "즉시 119 신고",
          "에피네프린 투여",
          "눕혀서 다리 올림",
          "응급실 이송",
        ],
      },

      diagnosis: "특이 IgE 검사, 피부단자검사",
      prevalence: "성인의 약 2%",
      prognosis: "평생 지속되는 경향",
    },

    peach: {
      code: "peach",
      name: "복숭아",
      emoji: "🍑",
      scientificName: "Prunus persica",
      category: "과일·채소",
      severity: "medium",
      description:
        "구강알레르기증후군을 일으키며, 자작나무 꽃가루 알레르기와 교차반응합니다.",

      symptoms: {
        mild: ["입안 가려움", "입술 붓기", "목 따가움"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스(드물게)"],
      },

      crossReactivity: ["자두", "체리", "살구", "사과", "자작나무 꽃가루"],

      commonFoods: [
        "복숭아",
        "천도복숭아",
        "복숭아주스",
        "복숭아 요거트",
        "복숭아 아이스크림",
      ],

      hiddenSources: ["복숭아 향료", "과일 믹스"],

      management: [
        "생 복숭아 회피",
        "가열 조리 시 알레르기 감소 가능",
        "껍질 제거 후 섭취 시도",
        "항히스타민제 비치",
      ],

      emergencyInfo: {
        signs: ["심한 구강 부종", "호흡곤란"],
        actions: ["항히스타민제 복용", "증상 심하면 병원 방문"],
      },

      diagnosis: "피부단자검사, 특이 IgE 검사",
      prevalence: "과일 알레르기 중 흔함",
      prognosis: "꽃가루 알레르기 동반 시 계절성 악화",
    },

    tomato: {
      code: "tomato",
      name: "토마토",
      emoji: "🍅",
      scientificName: "Solanum lycopersicum",
      category: "과일·채소",
      severity: "low",
      description:
        "가지과 채소로, 히스타민이 풍부하여 경미한 알레르기 반응을 일으킵니다.",

      symptoms: {
        mild: ["입안 가려움", "피부 발진"],
        moderate: ["소화불량", "복통", "설사"],
        severe: ["드물게 아나필락시스"],
      },

      crossReactivity: ["감자", "가지", "피망", "라텍스"],

      commonFoods: [
        "토마토",
        "토마토소스",
        "케첩",
        "토마토주스",
        "피자소스",
        "파스타소스",
      ],

      hiddenSources: ["가공식품", "소스류", "조미료"],

      management: [
        "생 토마토 회피",
        "조리된 토마토는 괜찮을 수 있음",
        "케첩, 소스 주의",
      ],

      emergencyInfo: {
        signs: ["경미한 증상"],
        actions: ["항히스타민제로 대부분 관리 가능"],
      },

      diagnosis: "피부단자검사",
      prevalence: "비교적 드문 편",
      prognosis: "대부분 경미하게 지속",
    },

    kiwi: {
      code: "kiwi",
      name: "키위",
      emoji: "🥝",
      scientificName: "Actinidia deliciosa",
      category: "과일·채소",
      severity: "medium",
      description: "라텍스 알레르기와 높은 교차반응성을 보입니다.",

      symptoms: {
        mild: ["입안 간지러움", "입술 붓기"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["호흡곤란", "아나필락시스"],
      },

      crossReactivity: ["라텍스", "바나나", "아보카도", "밤"],

      commonFoods: ["키위", "키위주스", "과일 샐러드", "스무디", "키위잼"],

      hiddenSources: ["과일 믹스", "스무디", "요거트"],

      management: ["키위 완전 회피", "라텍스 장갑 주의", "교차반응 식품 확인"],

      emergencyInfo: {
        signs: ["구강 부종", "호흡곤란"],
        actions: ["에피네프린 투여", "병원 방문"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "과일 알레르기 중 비교적 흔함",
      prognosis: "평생 지속 가능",
    },

    mango: {
      code: "mango",
      name: "망고",
      emoji: "🥭",
      scientificName: "Mangifera indica",
      category: "과일·채소",
      severity: "medium",
      description:
        "망고 껍질에 우루시올이 있어 접촉 피부염을 일으킬 수 있습니다.",

      symptoms: {
        mild: ["입 주변 발진", "입안 가려움"],
        moderate: ["두드러기", "구토"],
        severe: ["호흡곤란(드물게)"],
      },

      crossReactivity: ["옻나무", "캐슈넛", "피스타치오"],

      commonFoods: [
        "망고",
        "망고주스",
        "망고푸딩",
        "망고빙수",
        "열대과일 믹스",
      ],

      hiddenSources: ["열대과일 스무디", "과일샐러드"],

      management: ["망고 회피", "껍질 접촉 주의", "항히스타민제 비치"],

      emergencyInfo: {
        signs: ["피부 발진", "구강 부종"],
        actions: ["항히스타민제 복용"],
      },

      diagnosis: "피부단자검사",
      prevalence: "열대 지역에서 흔함",
      prognosis: "접촉 피부염은 회피 시 개선",
    },

    orange: {
      code: "orange",
      name: "오렌지",
      emoji: "🍊",
      scientificName: "Citrus sinensis",
      category: "과일·채소",
      severity: "low",
      description: "감귤류 알레르기는 비교적 드물고 경미합니다.",

      symptoms: {
        mild: ["입안 간지러움", "피부 발진"],
        moderate: ["두드러기", "소화불량"],
        severe: ["드물게 호흡곤란"],
      },

      crossReactivity: ["레몬", "자몽", "귤", "라임"],

      commonFoods: [
        "오렌지",
        "오렌지주스",
        "귤",
        "감귤",
        "마말레이드",
        "감귤류 음료",
      ],

      hiddenSources: ["과일향료", "비타민C 보충제(일부)"],

      management: ["감귤류 회피", "대부분 경미한 증상"],

      emergencyInfo: {
        signs: ["경미한 증상"],
        actions: ["항히스타민제로 관리"],
      },

      diagnosis: "피부단자검사",
      prevalence: "과일 알레르기 중 드묾",
      prognosis: "대부분 경미",
    },

    pork: {
      code: "pork",
      name: "돼지고기",
      emoji: "🥓",
      scientificName: "Sus scrofa domesticus",
      category: "육류",
      severity: "medium",
      description:
        "육류 알레르기는 드물지만, 진드기 교차반응으로 발생할 수 있습니다.",

      symptoms: {
        mild: ["피부 발진", "가려움"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["아나필락시스(드물게)"],
      },

      crossReactivity: ["고양이 알레르기", "돼지 상피"],

      commonFoods: ["돼지고기", "삼겹살", "햄", "소시지", "베이컨", "돈까스"],

      hiddenSources: ["젤라틴", "돼지 추출물"],

      management: ["돼지고기 완전 회피", "가공육 성분 확인"],

      emergencyInfo: {
        signs: ["심한 두드러기", "호흡곤란"],
        actions: ["에피네프린 투여"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "매우 드묾",
      prognosis: "회피로 관리 가능",
    },

    beef: {
      code: "beef",
      name: "쇠고기",
      emoji: "🥩",
      scientificName: "Bos taurus",
      category: "육류",
      severity: "medium",
      description: "알파갈 증후군(진드기 알레르ギ)과 관련될 수 있습니다.",

      symptoms: {
        mild: ["피부 발진", "가려움"],
        moderate: ["두드러기", "복통", "설사"],
        severe: ["아나필락시스(3-6시간 후)"],
      },

      crossReactivity: ["돼지고기", "양고기", "우유(드물게)"],

      commonFoods: ["쇠고기", "소고기", "육포", "스테이크", "불고기", "갈비"],

      hiddenSources: ["젤라틴", "소 추출물", "육수"],

      management: ["쇠고기 회피", "진드기 물림 주의", "증상 지연성이므로 주의"],

      emergencyInfo: {
        signs: ["섭취 3-6시간 후 아나필락시스"],
        actions: ["에피네프린 투여", "119 신고"],
      },

      diagnosis: "알파갈 특이 IgE 검사",
      prevalence: "진드기 많은 지역에서 증가",
      prognosis: "진드기 물림 회피 시 개선 가능",
    },

    chicken: {
      code: "chicken",
      name: "닭고기",
      emoji: "🍗",
      scientificName: "Gallus gallus domesticus",
      category: "육류",
      severity: "medium",
      description: "계란 알레르기와 교차반응이 있을 수 있습니다.",

      symptoms: {
        mild: ["피부 발진", "가려움"],
        moderate: ["구토", "복통", "두드러기"],
        severe: ["호흡곤란(드물게)"],
      },

      crossReactivity: ["계란", "칠면조", "오리"],

      commonFoods: ["닭고기", "치킨", "닭가슴살", "닭볶음탕", "삼계탕"],

      hiddenSources: ["육수", "조미료"],

      management: ["닭고기 회피", "계란 알레르기 확인"],

      emergencyInfo: {
        signs: ["두드러기", "호흡곤란"],
        actions: ["항히스타민제, 필요시 에피네프린"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "드묾",
      prognosis: "회피로 관리",
    },

    soy: {
      code: "soy",
      name: "대두",
      emoji: "🫘",
      scientificName: "Glycine max",
      category: "기타",
      severity: "medium",
      description: "많은 가공식품에 사용되지만, 발효식품은 괜찮을 수 있습니다.",

      symptoms: {
        mild: ["피부 발진", "가려움"],
        moderate: ["소화불량", "구토", "복통"],
        severe: ["호흡곤란(드물게)"],
      },

      crossReactivity: ["땅콩(5%)", "기타 콩류"],

      commonFoods: ["두부", "두유", "된장", "간장", "콩나물", "대두유"],

      hiddenSources: ["식물성 단백질", "레시틴", "대두 추출물", "간장", "된장"],

      management: [
        "대두 제품 회피",
        "간장, 된장은 발효되어 괜찮을 수 있음",
        "의사와 상담",
      ],

      emergencyInfo: {
        signs: ["두드러기", "호흡곤란"],
        actions: ["항히스타민제, 필요시 에피네프린"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "영유아의 0.3-0.5%",
      prognosis: "대부분 성장하며 극복",
    },

    sulfites: {
      code: "sulfites",
      name: "아황산류",
      emoji: "⚗️",
      scientificName: "Sulfur dioxide (SO2)",
      category: "기타",
      severity: "medium",
      description: "보존제로 사용되며, 천식 환자에게 특히 위험합니다.",

      symptoms: {
        mild: ["두드러기", "피부 가려움"],
        moderate: ["천식 악화", "쌕쌕거림"],
        severe: ["심한 호흡곤란", "아나필락시스"],
      },

      crossReactivity: [],

      commonFoods: [
        "와인",
        "맥주",
        "건과일",
        "새우(냉동)",
        "감자 가공품",
        "절임류",
      ],

      hiddenSources: [
        "이산화황",
        "아황산나트륨",
        "메타중아황산나트륨",
        "E220-E228",
      ],

      management: [
        "아황산 함유 식품 회피",
        "천식 약물 복용",
        "와인, 건과일 주의",
      ],

      emergencyInfo: {
        signs: ["천식 발작", "심한 호흡곤란"],
        actions: ["기관지 확장제 사용", "증상 심하면 119"],
      },

      diagnosis: "경구유발시험",
      prevalence: "천식 환자의 5-10%",
      prognosis: "회피로 관리 가능",
    },

    sesame: {
      code: "sesame",
      name: "참깨",
      emoji: "🌾",
      scientificName: "Sesamum indicum",
      category: "기타",
      severity: "medium",
      description:
        "한국 음식에 흔히 사용되며, 최근 알레르기가 증가 추세입니다.",

      symptoms: {
        mild: ["입안 가려움", "피부 발진"],
        moderate: ["두드러기", "구토", "복통"],
        severe: ["아나필락시스", "호흡곤란"],
      },

      crossReactivity: ["해바라기씨", "양귀비씨", "견과류"],

      commonFoods: [
        "참깨",
        "참기름",
        "깨소금",
        "깻잎",
        "빵",
        "과자",
        "초콜릿바",
      ],

      hiddenSources: ["참깨유", "타히니", "후무스", "빵 토핑", "조미료"],

      management: [
        "참깨 완전 회피",
        "한식, 중식 주의",
        "빵, 과자 성분 확인",
        "에피네프린 휴대",
      ],

      emergencyInfo: {
        signs: ["급격한 부종", "호흡곤란", "혈압 저하"],
        actions: ["즉시 에피네프린 투여", "119 신고"],
      },

      diagnosis: "특이 IgE 검사",
      prevalence: "증가 추세 (0.1-0.2%)",
      prognosis: "평생 지속 가능성",
    },
  };

// ==========================================
// 헬퍼 함수
// ==========================================

// 간단한 정보 가져오기 (기존 호환성)
export function getAllergenInfo(allergenName: string): AllergenInfo | null {
  if (ALLERGEN_DATABASE[allergenName]) {
    return ALLERGEN_DATABASE[allergenName];
  }

  for (const [key, value] of Object.entries(ALLERGEN_DATABASE)) {
    if (allergenName.includes(key) || key.includes(allergenName)) {
      return value;
    }
  }

  return null;
}

// 상세 정보 가져오기 (모달용)
export function getDetailedAllergenInfo(
  code: string,
): DetailedAllergenInfo | null {
  return DETAILED_ALLERGEN_DATABASE[code] || null;
}

export function getAllDetailedAllergens(): DetailedAllergenInfo[] {
  return Object.values(DETAILED_ALLERGEN_DATABASE);
}

export function getAllergensByCategory(
  category: DetailedAllergenInfo["category"],
): DetailedAllergenInfo[] {
  return Object.values(DETAILED_ALLERGEN_DATABASE).filter(
    (allergen) => allergen.category === category,
  );
}
