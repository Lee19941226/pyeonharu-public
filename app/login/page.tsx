"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { user, openLoginModal } = useAuth()

  useEffect(() => {
    if (user) {
      // 이미 로그인된 상태면 홈으로
      router.replace("/")
    } else {
      // 로그인 안 된 상태면 홈으로 보내고 모달 열기
      router.replace("/")
      // 약간의 딜레이 후 모달 열기 (라우팅 완료 후)
      setTimeout(() => {
        openLoginModal()
      }, 100)
    }
  }, [user, router, openLoginModal])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">리다이렉트 중...</p>
    </div>
  )
}
