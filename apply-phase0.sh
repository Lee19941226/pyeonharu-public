#!/bin/bash
# ============================================
# Phase 0: 긴급 수리 적용 스크립트
# 편하루 프로젝트 루트에서 실행하세요
# ============================================

echo "🔧 Phase 0: 긴급 수리 시작"
echo ""

# ============================================
# 01-01. getSession → getUser (header.tsx)
# ============================================
echo "📌 01-01. header.tsx: getSession → getUser"

# 수정된 header.tsx를 직접 복사하세요:
# phase0-fixes/components__layout__header.tsx → components/layout/header.tsx

echo "  → components/layout/header.tsx 파일을 교체하세요"
echo ""

# ============================================
# 01-02. 디버그 로그 제거 (7개 파일)
# ============================================
echo "📌 01-02. 디버그 로그 제거"

# app/api/food/result/route.ts — console.log / console.error 제거
sed -i '/console\.log/d' app/api/food/result/route.ts
sed -i '/console\.error.*⚠️/d' app/api/food/result/route.ts
echo "  ✅ app/api/food/result/route.ts"

# app/api/food/search/route.ts
sed -i '/console\.log/d' app/api/food/search/route.ts
echo "  ✅ app/api/food/search/route.ts"

# app/api/food/analyze-image/route.ts
sed -i '/console\.log/d' app/api/food/analyze-image/route.ts
sed -i '/console\.error.*분석 에러/d' app/api/food/analyze-image/route.ts
sed -i '/console\.error.*검색 실패/d' app/api/food/analyze-image/route.ts
echo "  ✅ app/api/food/analyze-image/route.ts"

# app/api/medicine/route.ts
sed -i '/console\.log/d' app/api/medicine/route.ts
echo "  ✅ app/api/medicine/route.ts"

# app/api/disease-stats/route.ts
sed -i '/console\.log/d' app/api/disease-stats/route.ts
sed -i '/console\.error.*getDiseaseStats/d' app/api/disease-stats/route.ts
echo "  ✅ app/api/disease-stats/route.ts"

# app/food/result/[id]/page.tsx — 디버그 로그 제거
sed -i '/console\.log.*🔍.*페이지에서/d' app/food/result/\[id\]/page.tsx
sed -i '/console\.log.*📡.*API 응답/d' app/food/result/\[id\]/page.tsx
sed -i '/console\.log.*📦.*API 응답/d' app/food/result/\[id\]/page.tsx
sed -i '/console\.log.*✅.*결과 설정/d' app/food/result/\[id\]/page.tsx
sed -i '/console\.error.*❌.*API 에러/d' app/food/result/\[id\]/page.tsx
sed -i '/console\.error.*💥.*로딩 에러/d' app/food/result/\[id\]/page.tsx
echo "  ✅ app/food/result/[id]/page.tsx"

# app/api/food/guide/route.ts
sed -i '/console\.log/d' app/api/food/guide/route.ts
sed -i '/console\.error.*캐시 저장/d' app/api/food/guide/route.ts
echo "  ✅ app/api/food/guide/route.ts"

echo ""

# ============================================
# 02-01. 세종시 코드 수정
# ============================================
echo "📌 02-01. 세종시 코드: 410000 → 360000"

# 수정된 region-codes.ts를 직접 복사하세요:
# phase0-fixes/lib__region-codes.ts → lib/region-codes.ts

echo "  → lib/region-codes.ts 파일을 교체하세요"
echo ""

# ============================================
# 02-03. localStorage SSR 가드
# ============================================
echo "📌 02-03. localStorage SSR 가드 추가"
echo "  ⚠️ 아래 2개 파일은 수동으로 확인하세요:"
echo ""
echo "  1) app/food/result/[id]/page.tsx"
echo "     saveToHistory 함수 내부:"
echo "     const existing = localStorage.getItem(...)  앞에 아래 추가:"
echo "     if (typeof window === 'undefined') return;"
echo ""
echo "  2) app/symptom/page.tsx"
echo "     getUsageToday 함수에 이미 typeof window 가드 있음 → 확인만"
echo ""

# ============================================
# 03. 코디/옷장 스펙아웃
# ============================================
echo "📌 03. 코디/옷장 스펙아웃"
echo ""

echo "  03-01. 파일 삭제:"
echo "  rm app/closet/page.tsx"
echo "  rm app/history/page.tsx"
echo ""

echo "  03-02. 링크 제거 (수동 작업 필요):"
echo "  1) components/layout/footer.tsx"
echo "     → '오늘 뭐 입지?' 섹션 전체 삭제 (/today, /closet, /weather, /history)"
echo ""
echo "  2) components/home/hero-section.tsx"
echo "     → '오늘의 코디 추천' 버튼 (<Link href=\"/today\">) 삭제"
echo ""
echo "  3) components/home/services-section.tsx"
echo "     → fashionServices 배열 전체 삭제 + '오늘 뭐 입지?' 섹션 삭제"
echo ""
echo "  4) app/about/page.tsx"
echo "     → features에서 코디 관련 3개 항목 삭제"
echo ""
echo "  5) app/mypage/page.tsx"
echo "     → Quick Links: '내 옷장', '코디 기록' 링크 삭제"
echo "     → 알림 설정: '코디 추천 알림' Switch 삭제"
echo ""
echo "  6) lib/supabase/proxy.ts"
echo "     → protectedPaths에서 '/closet', '/style' 제거"
echo ""
echo "  7) app/layout.tsx"
echo "     → keywords에서 '옷차림 추천', '날씨 코디' 삭제"
echo "     → description에서 코디 언급 삭제"
echo ""

echo "🔧 Phase 0 완료! 빌드 테스트를 실행하세요: npm run build"
