# 🍀 편하루 (pyeonharu) - 통합 건강관리 앱

> Team Project | 2026.02 - 2026.03 | 2인 프로젝트

식품 알레르기 확인 · 급식 체크 · 병원/약국 찾기 통합 건강관리 앱입니다.

## 🛠 기술 스택
- **Frontend**: React 19, TailwindCSS, html5-qrcode, Recharts, shadcn/ui
- **Backend**: Next.js 16 App Router, API Routes
- **Database**: Supabase (PostgreSQL + RLS + Auth + Storage)
- **AI/API**: OpenAI GPT-4o / Vision, 식약처 공공API, NEIS, Naver Maps, Open Food Facts
- **Deploy**: Vercel (Web), React Native (Android 개발 중)

## 👤 담당 기능 (이용재)
- **식품 탭 (검색 & 스캔)**: DB 캐시 우선 조회(0.1~0.3초) → 외부 API 병렬 호출 2단계 검색 구조
- **식품 상세 & AI 분석**: 괄호 중첩 원재료 파싱 알고리즘, 알레르기 매칭 & 하이라이트
- **AI 기능**: GPT-4o 기반 대처법 가이드 + 3단계 대체식품 추천
- **마이페이지 & 개인화**: RLS 기반 데이터 격리, 30일 알레르기 인사이트 차트
- **관리자 도구**: 데이터 대시보드, 캐시 및 Rate Limit 관리, 활동 로그 시각화
- **비용 최적화**: 등급별 Rate Limiting 차등 적용, 5분 내 중복 스캔 방지

## ⚡ 성능 개선
| 항목 | Before | After |
|------|--------|-------|
| 식품 검색 응답 | 2~3초 (매번 외부 API) | 0.1~0.3초 (DB 캐시) |
| API 비용 | 중복 호출 발생 | 캐싱 + 중복 차단 |

## 📐 아키텍처
React 19 → Next.js App Router (API Routes) → Supabase (PostgreSQL + RLS) / External APIs (식약처, OpenAI)

## 🔗 Links
- [배포 URL](https://leeyongjae-portfolio.vercel.app) (포트폴리오)
