import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">편</span>
              </div>
              <span className="text-xl font-bold">편하루</span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              의식주를 편하게 만드는 생활 플랫폼
            </p>
          </div>

          {/* 병원/약국 */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">병원/약국</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/search" className="hover:text-foreground">
                  지도로 검색
                </Link>
              </li>
              <li>
                <Link href="/symptom" className="hover:text-foreground">
                  증상으로 추천
                </Link>
              </li>
              <li>
                <Link href="/medicine" className="hover:text-foreground">
                  약 정보 검색
                </Link>
              </li>
            </ul>
          </div>

          {/* 먹어도 돼? */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">먹어도 돼?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/can-i-eat" className="hover:text-foreground">
                  음식 알러지 확인
                </Link>
              </li>
            </ul>
          </div>

          {/* 오늘 뭐 입지? */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">오늘 뭐 입지?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/today" className="hover:text-foreground">
                  오늘의 코디
                </Link>
              </li>
              <li>
                <Link href="/closet" className="hover:text-foreground">
                  내 옷장
                </Link>
              </li>
              <li>
                <Link href="/weather" className="hover:text-foreground">
                  날씨 상세
                </Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-foreground">
                  코디 기록
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
