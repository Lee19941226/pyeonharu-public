import Link from "next/link";
import { PyeonharuLogo } from "@/components/pyeonharu-logo";

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-background/70 backdrop-blur-xl pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          {/* 로고 + 슬로건 */}
          <Link href="/">
            <PyeonharuLogo size="sm" />
          </Link>

          {/* 링크 */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link
              href="/about"
              className="px-2 py-1 hover:text-foreground transition-colors"
            >
              서비스 소개
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/support"
              className="px-2 py-1 hover:text-foreground transition-colors"
            >
              고객센터
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/privacy"
              className="px-2 py-1 font-semibold hover:text-foreground transition-colors"
            >
              개인정보처리방침
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/terms"
              className="px-2 py-1 hover:text-foreground transition-colors"
            >
              이용약관
            </Link>
          </div>

          {/* 카피라이트 */}
          <p className="text-[11px] text-muted-foreground/60">
            &copy; {new Date().getFullYear()} 편하루. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
