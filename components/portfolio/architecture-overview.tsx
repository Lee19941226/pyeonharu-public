"use client";

import {
  Lock,
  Search,
  MessageSquare,
  Shield,
  UtensilsCrossed,
  FileCode2,
  Pill,
  Stethoscope,
  MapPin,
  GraduationCap,
  Users,
  Building2,
  Bookmark,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FlowStep {
  file: string;
  description: string;
}

interface ArchitectureFlow {
  icon: React.ReactNode;
  title: string;
  summary: string;
  steps: FlowStep[];
  techStack: string[];
  security: string[];
}

const ARCHITECTURE_FLOWS: ArchitectureFlow[] = [
  {
    icon: <Lock className="h-5 w-5" />,
    title: "인증 (로그인/회원가입)",
    summary: "Supabase Auth 기반 OAuth 2.0 인증 및 세션 관리 흐름",
    steps: [
      {
        file: "app/login/page.tsx",
        description: "로그인/회원가입 UI 렌더링 및 폼 제출 처리",
      },
      {
        file: "app/auth/callback/route.ts",
        description: "OAuth 콜백 처리 및 세션 교환",
      },
      {
        file: "lib/supabase/client.ts",
        description: "클라이언트 사이드 Supabase 인스턴스 생성",
      },
      {
        file: "lib/supabase/server.ts",
        description: "서버 사이드 Supabase 인스턴스 (쿠키 기반)",
      },
      {
        file: "middleware.ts",
        description: "보호 경로 접근 제어 및 세션 갱신",
      },
      {
        file: "lib/supabase/proxy.ts",
        description: "Supabase 프록시를 통한 환경변수 보호",
      },
    ],
    techStack: ["Supabase Auth", "JWT", "OAuth 2.0"],
    security: [
      "Open redirect 방지 (화이트리스트 기반 리다이렉트 검증)",
      "보호 경로 미들웨어 (인증되지 않은 접근 차단)",
      "SameSite 쿠키 (CSRF 방지)",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "식품 안전 확인",
    summary: "공공 API와 AI 비전을 활용한 식품 성분 분석 및 안전성 확인",
    steps: [
      {
        file: "app/food/page.tsx",
        description: "식품 검색 UI, QR/바코드 스캐너, 이미지 업로드",
      },
      {
        file: "app/api/food/search/route.ts",
        description: "식약처 공공 API를 통한 식품 정보 검색",
      },
      {
        file: "app/api/food/analyze-image/route.ts",
        description: "OpenAI Vision으로 식품 라벨 이미지 분석",
      },
      {
        file: "lib/utils/chosung.ts",
        description: "한글 초성 검색 지원 유틸리티",
      },
      {
        file: "lib/utils/openai-rate-limit.ts",
        description: "OpenAI API 호출 횟수 제한 관리",
      },
    ],
    techStack: ["OpenAI Vision", "식약처 공공 API", "GPT-4o-mini", "html5-qrcode"],
    security: [
      "Rate limiting (인증 사용자 50회/일, 비인증 10회/일)",
      "입력값 검증 (파일 타입, 크기 제한)",
    ],
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "커뮤니티",
    summary: "리치 텍스트 에디터 기반 게시글/댓글 CRUD 및 XSS 방지",
    steps: [
      {
        file: "app/community/page.tsx",
        description: "게시글 목록 조회 및 페이지네이션",
      },
      {
        file: "app/community/write/page.tsx",
        description: "TipTap 리치 텍스트 에디터로 게시글 작성",
      },
      {
        file: "app/api/community/route.ts",
        description: "게시글 CRUD API (생성/조회/수정/삭제)",
      },
      {
        file: "app/api/community/[id]/comments/route.ts",
        description: "댓글/대댓글 CRUD 및 중첩 제한",
      },
    ],
    techStack: ["TipTap Editor", "DOMPurify", "Supabase Storage"],
    security: [
      "XSS 방지 (DOMPurify 클라이언트 + 서버 HTML 스트리핑)",
      "소유권 검증 (본인 게시글/댓글만 수정/삭제)",
      "댓글 중첩 깊이 제한",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "관리자 대시보드",
    summary: "실시간 통계, 사용자 관리, SSE 기반 온라인 모니터링",
    steps: [
      {
        file: "app/admin/layout.tsx",
        description: "관리자 레이아웃 가드 (서버 사이드 권한 검증)",
      },
      {
        file: "app/admin/page.tsx",
        description: "대시보드 UI (차트, 통계, 사용자 목록)",
      },
      {
        file: "lib/utils/admin-auth.ts",
        description: "관리자 역할 검증 유틸리티",
      },
      {
        file: "app/api/admin/online/route.ts",
        description: "SSE 기반 실시간 접속자 모니터링",
      },
      {
        file: "app/api/admin/stats/route.ts",
        description: "통계 데이터 집계 API",
      },
    ],
    techStack: ["SSE", "Recharts", "service_role key"],
    security: [
      "역할 기반 접근 제어 (admin 역할 필수)",
      "서버 사이드 레이아웃 가드 (클라이언트 우회 불가)",
    ],
  },
  {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    title: "식단 관리",
    summary: "AI 기반 식단 이미지 분석, 영양소 추정, BMR 계산 및 리포트",
    steps: [
      {
        file: "app/diet/page.tsx",
        description: "식단 기록 UI, 이미지 업로드 및 분석 결과 표시",
      },
      {
        file: "app/api/diet/analyze/route.ts",
        description: "OpenAI Vision으로 음식 이미지 분석",
      },
      {
        file: "app/api/diet/estimate/route.ts",
        description: "음식별 영양소 및 칼로리 추정",
      },
      {
        file: "app/api/diet/bmr/route.ts",
        description: "기초대사량(BMR) 계산",
      },
      {
        file: "app/api/diet/report/route.ts",
        description: "일간/주간 식단 리포트 생성",
      },
    ],
    techStack: ["OpenAI Vision", "BMR Algorithm"],
    security: ["인증 필수 (로그인된 사용자만 접근 가능)"],
  },
  {
    icon: <Pill className="h-5 w-5" />,
    title: "의약품 검색",
    summary: "공공데이터 API를 통한 의약품 정보 검색 및 HTML 정제",
    steps: [
      {
        file: "app/api/medicine/route.ts",
        description: "공공데이터 API 프록시, HTML 태그 정제 후 의약품 정보 반환",
      },
    ],
    techStack: ["공공데이터 API (data.go.kr)", "XML/JSON 파싱"],
    security: [
      "입력값 검증 (itemName 필수, URL 인코딩)",
      "HTML 태그 정제 (XSS 방지, cleanHtml 함수)",
      "API 키 환경변수 관리 (로그에 KEY_HIDDEN 처리)",
    ],
  },
  {
    icon: <Stethoscope className="h-5 w-5" />,
    title: "증상 분석",
    summary: "AI 기반 증상 분석, 질환 추정, 진료과 추천 및 주변 병원 연결",
    steps: [
      {
        file: "components/tabs/SymptomTab.tsx",
        description: "4단계 UI (입력 → 분석중 → 결과 → 병원상세), 네이버 지도 연동",
      },
      {
        file: "app/api/symptom-analyze/route.ts",
        description: "GPT-4o-mini로 증상 분석, 질환/진료과/식이요법 JSON 응답",
      },
      {
        file: "lib/utils/openai-rate-limit.ts",
        description: "메모리 기반 OpenAI API 호출 제한 (분당 30회, 일 1000회)",
      },
    ],
    techStack: ["OpenAI GPT-4o-mini", "Naver Map API", "Geolocation API", "Supabase"],
    security: [
      "다중 Rate Limiting (DB: 인증 20회/비인증 5회/일 + 메모리: OpenAI 비용 제어)",
      "입력값 검증 (500자 제한, 타입 체크)",
      "응급 상황 감지 (emergencyLevel에 따른 119 안내)",
    ],
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: "맛집 추천",
    summary: "위치 기반 음식점 검색, 알레르기 위험도 판단, AI 메뉴 분석 및 리뷰",
    steps: [
      {
        file: "app/api/restaurant/search/route.ts",
        description: "소상공인 API로 반경 내 음식점 검색, 알레르기 위험도 매핑",
      },
      {
        file: "app/api/restaurant/analyze/route.ts",
        description: "GPT-4o-mini로 음식점 메뉴/알레르기 AI 분석",
      },
      {
        file: "app/api/restaurant/geocode/route.ts",
        description: "지역명 → 좌표 변환 (120+ 한국 지역 내장 DB)",
      },
      {
        file: "app/api/restaurant/reverse-geocode/route.ts",
        description: "좌표 → 지역명 역변환",
      },
      {
        file: "app/api/restaurant/reviews/route.ts",
        description: "음식점 리뷰 CRUD (1인 1리뷰 upsert 정책)",
      },
    ],
    techStack: ["소상공인 상가정보 API", "OpenAI GPT-4o-mini", "Haversine 거리 공식", "Supabase"],
    security: [
      "IP 기반 Rate Limiting (20회/분, restaurant_rate_limits 테이블)",
      "인증 필수 (AI 분석, 리뷰 작성/삭제)",
      "소유권 검증 (본인 리뷰만 삭제 가능)",
      "74개 카테고리-알레르겐 매핑으로 위험도 자동 판단",
    ],
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "학교 급식",
    summary: "NEIS 연동 급식 조회, 알레르기 교차 오염 감지, 이메일 알림",
    steps: [
      {
        file: "app/school/page.tsx",
        description: "학교 검색 및 등록 관리 (최대 5개교)",
      },
      {
        file: "app/school/[id]/page.tsx",
        description: "일간/주간 급식 상세 조회, 알레르기 매칭 시각화",
      },
      {
        file: "app/api/school/meals/route.ts",
        description: "NEIS API 급식 조회, 캐싱, 알레르기 교차 오염 감지",
      },
      {
        file: "app/api/school/register/route.ts",
        description: "학교 등록/해제/목록 API (사용자별 관리)",
      },
      {
        file: "app/api/cron/daily-meal-check/route.ts",
        description: "Vercel Cron 일일 급식 알레르기 이메일 알림",
      },
    ],
    techStack: ["NEIS Open API", "Supabase", "Nodemailer (Gmail SMTP)", "Vercel Cron"],
    security: [
      "인증 필수 (학교 등록/알레르기 매칭)",
      "크론 Bearer 토큰 검증 (CRON_SECRET)",
      "19종 알레르기 코드 매핑 + 교차 오염 규칙 (계란↔닭고기, 우유↔쇠고기 등)",
      "학교 등록 수 제한 (사용자당 5개교)",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "가족 관리",
    summary: "가족 구성원별 알레르기 정보 관리 및 식품 안전 확인 연동",
    steps: [
      {
        file: "app/family/page.tsx",
        description: "가족 구성원 CRUD UI, 다중 알레르기 선택, 심각도 설정",
      },
      {
        file: "app/api/family/route.ts",
        description: "가족 구성원/알레르기 CRUD API (RPC 원자적 트랜잭션)",
      },
    ],
    techStack: ["Supabase RPC", "Supabase RLS", "PostgreSQL"],
    security: [
      "소유권 검증 (owner_id 기반 접근 제어)",
      "원자적 트랜잭션 (RPC로 알레르기 일괄 갱신, 실패 시 롤백)",
      "구성원 10명 제한 (리소스 관리)",
      "입력값 검증 (이름 10자, 알레르기 코드/명 50자 제한)",
    ],
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "병원/약국 찾기",
    summary: "지역별/위치 기반 병원 약국 검색, 공공 API 프록시, 거리순 정렬",
    steps: [
      {
        file: "app/area/page.tsx",
        description: "전국 17개 시도 지역 선택 랜딩 페이지",
      },
      {
        file: "app/api/area/hospitals/route.ts",
        description: "HIRA API 프록시, 시도코드 기반 병원 목록 조회",
      },
      {
        file: "app/api/area/pharmacies/route.ts",
        description: "국립중앙의료원 API 프록시, 시도명 기반 약국 목록 조회",
      },
      {
        file: "app/api/hospitals/route.ts",
        description: "위경도 기반 반경 내 병원 검색 (Haversine 거리 계산)",
      },
      {
        file: "app/api/pharmacies/route.ts",
        description: "위경도 기반 반경 내 약국 검색 (Fallback 시도명 재시도)",
      },
    ],
    techStack: ["HIRA API", "국립중앙의료원 API", "Haversine 공식", "Naver Map", "ISR (1시간)"],
    security: [
      "지역 코드 화이트리스트 (17개 시도 REGIONS 객체)",
      "반경 범위 제한 (100m ~ 5000m)",
      "ISR 캐싱으로 API 호출 최소화 (1시간 revalidate)",
      "API 키 환경변수 관리",
    ],
  },
  {
    icon: <Bookmark className="h-5 w-5" />,
    title: "북마크",
    summary: "병원, 약국, 음식의 즐겨찾기 관리 및 중복 방지",
    steps: [
      {
        file: "app/bookmarks/page.tsx",
        description: "3개 탭 (병원/약국/음식) 즐겨찾기 목록 및 삭제 관리",
      },
      {
        file: "app/api/bookmarks/route.ts",
        description: "병원/약국 즐겨찾기 CRUD API",
      },
      {
        file: "app/api/bookmarks/check/route.ts",
        description: "특정 항목의 즐겨찾기 여부 확인 API",
      },
      {
        file: "app/api/food/favorites/route.ts",
        description: "음식 즐겨찾기 CRUD API (별도 테이블)",
      },
    ],
    techStack: ["Supabase RLS", "PostgreSQL Unique Constraint"],
    security: [
      "3중 인증 (미들웨어 보호 경로 + API 인증 + Supabase RLS)",
      "중복 방지 (unique(user_id, item_id) 제약 조건, 409 Conflict)",
      "타입 화이트리스트 (hospital/pharmacy만 허용)",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "주간 리포트",
    summary: "주간 식품 스캔 통계, 위험 식품 감지, 일별 추이 차트",
    steps: [
      {
        file: "app/reports/page.tsx",
        description: "주간 리포트 UI (요약 카드, 일별 차트, 위험 식품 목록)",
      },
      {
        file: "app/api/reports/weekly/route.ts",
        description: "주간 스캔 데이터 집계, 전주 대비 비교, 위험 식품/즐겨찾기 분석",
      },
    ],
    techStack: ["Supabase", "Custom 차트"],
    security: [
      "인증 필수 (보호 경로 미들웨어 + API 인증)",
      "RLS 기반 데이터 격리 (본인 스캔 기록만 조회)",
    ],
  },
];

interface ArchitectureOverviewProps {
  onNavigateToFile: (filePath: string) => void;
}

export function ArchitectureOverview({
  onNavigateToFile,
}: ArchitectureOverviewProps) {
  return (
    <ScrollArea style={{ height: "calc(100vh - 16rem)" }}>
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-lg font-semibold">아키텍처 개요</h2>
          <p className="text-sm text-muted-foreground">
            주요 기능별 데이터 흐름과 기술 스택, 보안 조치를 확인할 수 있습니다.
            파일 경로를 클릭하면 소스코드를 바로 확인할 수 있습니다.
          </p>
        </div>

        {ARCHITECTURE_FLOWS.map((flow, index) => (
          <FlowCard key={index} flow={flow} onNavigateToFile={onNavigateToFile} />
        ))}
      </div>
    </ScrollArea>
  );
}

function FlowCard({
  flow,
  onNavigateToFile,
}: {
  flow: ArchitectureFlow;
  onNavigateToFile: (filePath: string) => void;
}) {
  return (
    <div className="rounded-lg border bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {flow.icon}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{flow.title}</h3>
          <p className="text-sm text-muted-foreground">{flow.summary}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Timeline */}
        <div className="space-y-0">
          {flow.steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              {/* Number circle + connector line */}
              <div className="flex flex-col items-center">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {i + 1}
                </div>
                {i < flow.steps.length - 1 && (
                  <div className="w-px flex-1 bg-border" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4 min-w-0">
                <button
                  onClick={() => onNavigateToFile(step.file)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs text-primary hover:bg-primary/10 transition-colors"
                >
                  <FileCode2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{step.file}</span>
                </button>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            기술 스택
          </p>
          <div className="flex flex-wrap gap-1.5">
            {flow.techStack.map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              보안 조치
            </span>
          </div>
          <ul className="space-y-1">
            {flow.security.map((item, i) => (
              <li
                key={i}
                className="text-sm text-muted-foreground flex items-start gap-1.5"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
