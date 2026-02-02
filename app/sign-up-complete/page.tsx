"use client"

import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SignUpCompletePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-8 text-center shadow-lg">
        {/* Celebration icon */}
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
          <span className="text-4xl">🎉</span>
        </div>

        <h1 className="text-2xl font-bold">가입이 완료되었어요!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          편하루에 오신 것을 환영합니다.
        </p>

        {/* Allergy Registration Prompt */}
        <div className="mt-6 rounded-xl border-2 border-orange-200 bg-orange-50 p-5">
          <h2 className="text-base font-semibold text-orange-800">
            🍽 알러지 정보를 등록해볼까요?
          </h2>
          <p className="mt-1 text-sm text-orange-700">
            &quot;이거 먹어도 돼?&quot; 기능을 사용하려면<br />
            알러지 정보 등록이 필요해요
          </p>

          <div className="mt-4 flex gap-2">
            <Button asChild className="flex-1">
              <Link href="/mypage#allergy">지금 등록하기</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">나중에 할게요</Link>
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            마이페이지에서 언제든 등록할 수 있어요
          </p>
        </div>
      </div>
    </div>
  )
}
