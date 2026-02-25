"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const router = useRouter()
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedMarketing, setAgreedMarketing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleOAuthSignUp = async (provider: "kakao" | "google") => {
    if (!agreedTerms) return
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/sign-up-complete`,
      },
    })

    if (error) {
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = () => {
    if (!agreedTerms) return
    // 약관 동의 상태를 query param으로 전달
    router.push(`/sign-up/email?terms=true&marketing=${agreedMarketing}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      {/* Back button */}
      <div className="w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>
      </div>

      {/* Logo */}
      <Link href="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground">편</span>
        </div>
      </Link>
      <h1 className="text-2xl font-bold">편하루</h1>

      {/* Sign up card */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-5 text-center">
          <h2 className="text-lg font-semibold">회원가입</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            간편하게 가입하고 편하루를 시작하세요
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => handleOAuthSignUp("kakao")}
            disabled={!agreedTerms || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.56-.2.76-.74 2.76-.84 3.2-.12.52.2.52.4.38.16-.1 2.56-1.74 3.6-2.44.72.1 1.48.16 2.24.16 5.52 0 10-3.48 10-7.86S17.52 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>

          <button
            onClick={() => handleOAuthSignUp("google")}
            disabled={!agreedTerms || isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google로 시작하기
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">또는</span>
          </div>
        </div>

        {/* Email Sign Up Button */}
        <button
          onClick={handleEmailSignUp}
          disabled={!agreedTerms || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary/30 bg-white px-4 py-3 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>✉️</span>
          이메일로 가입하기
        </button>

        {/* Terms Checkboxes */}
        <div className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                agreedTerms
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
              onClick={() => setAgreedTerms(!agreedTerms)}
            >
              {agreedTerms && <Check className="h-3.5 w-3.5" />}
            </div>
            <div className="text-sm">
              <span onClick={() => setAgreedTerms(!agreedTerms)}>
                이용약관 및 개인정보처리방침에 동의합니다{" "}
                <span className="text-destructive">(필수)</span>
              </span>
              <div className="mt-0.5 flex gap-2 text-xs text-muted-foreground">
                <Link href="/terms" className="underline hover:text-primary">
                  이용약관 보기
                </Link>
                <span>|</span>
                <Link href="/privacy" className="underline hover:text-primary">
                  개인정보처리방침 보기
                </Link>
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <div
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                agreedMarketing
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
              onClick={() => setAgreedMarketing(!agreedMarketing)}
            >
              {agreedMarketing && <Check className="h-3.5 w-3.5" />}
            </div>
            <span className="text-sm" onClick={() => setAgreedMarketing(!agreedMarketing)}>
              마케팅 정보 수신에 동의합니다{" "}
              <span className="text-muted-foreground">(선택)</span>
            </span>
          </label>
        </div>

        {/* Bottom Links */}
        <div className="mt-5 space-y-1 text-center text-sm">
          <p className="text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              로그인
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            로그인 없이도 기본 기능을 이용할 수 있어요
          </p>
        </div>
      </div>
    </div>
  )
}
