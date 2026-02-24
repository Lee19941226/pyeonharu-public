import Link from "next/link";
import { PyeonharuLogo } from "@/components/pyeonharu-logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand — ✅ 새 로고 적용 */}
          <div className="md:col-span-1">
            <Link href="/">
              <PyeonharuLogo size="sm" />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">식사를 편하게</p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">알레르기</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
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

          <div>
            <h3 className="mb-4 text-sm font-semibold">건강</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  병원/약국 찾기
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-foreground">
                  AI 증상 분석
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-foreground">
                  약 정보 검색
                </Link>
              </li>
            </ul>
          </div>

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
  );
}
