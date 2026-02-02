"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function SignUpSuccessPage() {
  const [isResending, setIsResending] = useState(false)
  const [resent, setResent] = useState(false)

  const handleResend = async () => {
    setIsResending(true)
    // Note: Supabase의 resend 기능은 signUp을 다시 호출하는 것으로 처리
    // 실제 구현에서는 저장된 이메일을 사용해야 함
    const supabase = createClient()
    await supabase.auth.resend({
      type: "signup",
      email: "", // 실제로는 이전 페이지에서 전달받은 이메일을 사용
    })
    setIsResending(false)
    setResent(true)
    setTimeout(() => setResent(false), 3000)
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
          입력하신 이메일로 인증 링크를 보내드렸습니다.
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
            disabled={isResending}
          >
            {isResending ? "전송 중..." : resent ? "✅ 재발송 완료!" : "인증 메일 재발송"}
          </Button>
        </div>
      </div>
    </div>
  )
}
