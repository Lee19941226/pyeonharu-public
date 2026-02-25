"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function SignUpSuccessPage() {
  const [isResending, setIsResending] = useState(false)
  const [resent, setResent] = useState(false)
  const searchParams = useSearchParams()

  // ✅ URL 파라미터 또는 sessionStorage에서 이메일 복원
  const [signupEmail, setSignupEmail] = useState("")

  useEffect(() => {
    const emailFromParam = searchParams?.get("email") || ""
    if (emailFromParam) {
      setSignupEmail(emailFromParam)
      // 다음 접근을 위해 sessionStorage에도 저장
      try {
        sessionStorage.setItem("signup_email", emailFromParam)
      } catch { /* ignore */ }
    } else {
      // URL에 없으면 sessionStorage에서 복원 시도
      try {
        const stored = sessionStorage.getItem("signup_email") || ""
        setSignupEmail(stored)
      } catch { /* ignore */ }
    }
  }, [searchParams])

  const handleResend = async () => {
    if (!signupEmail) return // 이메일이 없으면 재발송하지 않음

    setIsResending(true)
    try {
      const supabase = createClient()
      await supabase.auth.resend({
        type: "signup",
        email: signupEmail,
      })
      setResent(true)
      setTimeout(() => setResent(false), 3000)
    } catch {
      // 실패 시에도 UX 유지
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-xl font-bold text-primary-foreground">편</span>
        </div>
        <span className="text-2xl font-bold">편하루</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-lg">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
          <Mail className="h-10 w-10 text-purple-500" />
        </div>

        <h1 className="text-2xl font-bold">이메일을 확인해주세요</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          {signupEmail ? (
            <>
              <strong>{signupEmail}</strong>으로 인증 링크를 보내드렸습니다.
            </>
          ) : (
            "입력하신 이메일로 인증 링크를 보내드렸습니다."
          )}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          메일함에서 편하루 인증 메일을 확인하고,<br />
          링크를 클릭하면 가입이 완료됩니다.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          메일이 도착하지 않았다면 스팸함을 확인해주세요.
        </p>

        <div className="mt-6 space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">
              로그인 페이지로 <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={handleResend}
            disabled={isResending || !signupEmail}
          >
            {!signupEmail
              ? "이메일 정보 없음"
              : isResending
                ? "전송 중..."
                : resent
                  ? "✅ 재발송 완료!"
                  : "인증 메일 재발송"}
          </Button>
        </div>
      </div>
    </div>
  )
}
