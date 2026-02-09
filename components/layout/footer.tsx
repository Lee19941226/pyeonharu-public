import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">편</span>
              </div>
              <span className="text-xl font-bold">편하루</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              우리 가족 식품 안전을 지키는 생활 플랫폼
            </p>
          </div>

          {/* 알레르기 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">알레르기</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/food" className="hover:text-foreground">
                  식품 알레르기 확인
                </Link>
              </li>
              <li>
                <Link href="/food/camera" className="hover:text-foreground">
                  바코드 스캔
                </Link>
              </li>
              <li>
                <Link href="/food/profile" className="hover:text-foreground">
                  내 알레르기 정보
                </Link>
              </li>
              <li>
                <Link href="/food/history" className="hover:text-foreground">
                  확인 기록
                </Link>
              </li>
            </ul>
          </div>

          {/* 건강 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">건강</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/search" className="hover:text-foreground">
                  병원/약국 찾기
                </Link>
              </li>
              <li>
                <Link href="/symptom" className="hover:text-foreground">
                  AI 증상 분석
                </Link>
              </li>
              <li>
                <Link href="/medicine" className="hover:text-foreground">
                  약 정보 검색
                </Link>
              </li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">고객지원</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground">
                  서비스 소개
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} 편하루. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
