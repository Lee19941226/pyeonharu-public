"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Check, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function EmailSignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const termsFromPrev = searchParams.get("terms") === "true"
  const marketingFromPrev = searchParams.get("marketing") === "true"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Terms state - pre-filled if coming from sign-up page
  const [agreedTerms, setAgreedTerms] = useState(termsFromPrev)
  const [agreedMarketing, setAgreedMarketing] = useState(marketingFromPrev)

  const passwordRequirements = [
    { met: password.length >= 8, text: "8자 이상" },
    { met: /[A-Z]/.test(password), text: "대문자" },
    { met: /[0-9]/.test(password), text: "숫자" },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: "특수문자" },
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.met)
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0

  const canSubmit =
    name.trim() !== "" &&
    email.trim() !== "" &&
    isPasswordValid &&
    doPasswordsMatch &&
    agreedTerms

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/`,
        data: {
          name,
          marketing_consent: agreedMarketing,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setError("이미 가입된 이메일입니다.")
      } else {
        setError("회원가입 중 오류가 발생했습니다.")
      }
      setIsLoading(false)
      return
    }

    router.push("/sign-up-success")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      {/* Top bar */}
      <div className="flex w-full max-w-md items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </button>
        <h1 className="text-base font-semibold">이메일 가입</h1>
        <div className="w-12" />
      </div>

      {/* Form Card */}
      <div className="mt-6 w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        <div className="mb-5 text-center">
          <h2 className="text-lg font-semibold">이메일 회원가입</h2>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {passwordRequirements.map((req) => (
                <span
                  key={req.text}
                  className={`flex items-center gap-1 ${
                    req.met ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  {req.met ? <Check className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
                  {req.text}
                </span>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            {confirmPassword && (
              <p
                className={`text-xs ${
                  doPasswordsMatch ? "text-green-600" : "text-destructive"
                }`}
              >
                {doPasswordsMatch
                  ? "비밀번호가 일치합니다"
                  : "비밀번호가 일치하지 않습니다"}
              </p>
            )}
          </div>

          {/* Terms (if not already agreed from prev page) */}
          {!termsFromPrev && (
            <div className="space-y-3 rounded-lg bg-muted/50 p-3">
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
          )}

          {/* Submit */}
          <div className="space-y-2">
            {!canSubmit && (
              <p className="text-center text-xs text-muted-foreground">
                필수 약관 동의 + 모든 항목 입력 시 활성화
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || isLoading}
            >
              {isLoading ? "가입 중..." : "가입하기"}
            </Button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
