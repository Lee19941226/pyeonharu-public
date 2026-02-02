"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { X, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { createClient } from "@/lib/supabase/client"

type ModalView = "login" | "reset-request" | "reset-sent"

export function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, refreshUser } = useAuth()
  const router = useRouter()

  const [view, setView] = useState<ModalView>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isLoginModalOpen) {
      setView("login")
      setEmail("")
      setPassword("")
      setResetEmail("")
      setShowPassword(false)
      setError(null)
      setIsLoading(false)
    }
  }, [isLoginModalOpen])

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Clear error on input change
  const clearError = useCallback(() => {
    if (error) setError(null)
  }, [error])

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isLoginModalOpen) {
        closeLoginModal()
      }
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [isLoginModalOpen, closeLoginModal])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isLoginModalOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isLoginModalOpen])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      if (loginError.message.includes("Email not confirmed")) {
        setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.")
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.")
      }
      setIsLoading(false)
      return
    }

    await refreshUser()
    setIsLoading(false)
    closeLoginModal()
    router.refresh()
  }

  const handleOAuthLogin = async (provider: "kakao" | "google" | "google-oidc" | "naver") => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const actualProvider = provider === "google-oidc" ? "google" : provider
    
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: actualProvider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (oauthError) {
      setError("소셜 로그인 중 오류가 발생했습니다. 다시 시도해주세요.")
      setIsLoading(false)
    }
  }

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError("가입되지 않은 이메일입니다.")
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setView("reset-sent")
  }

  const handleResendReset = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setIsLoading(false)
  }

  if (!isLoginModalOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeLoginModal}
      />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-[400px] rounded-2xl bg-background shadow-2xl">
        {/* Close button */}
        <button
          onClick={closeLoginModal}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Error Banner */}
        {error && (
          <div className="absolute left-0 right-0 top-0 z-20 rounded-t-2xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
            ⚠️ {error}
          </div>
        )}

        {view === "login" && (
          <div className="px-6 pb-6 pt-8">
            {/* Logo & Title */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
                <span className="text-2xl font-bold text-primary-foreground">편</span>
              </div>
              <h2 className="text-xl font-bold">편하루</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                로그인하고 더 많은 기능을 이용하세요
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={() => handleOAuthLogin("kakao")}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-4 py-3 text-sm font-medium text-[#191919] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.56-.2.76-.74 2.76-.84 3.2-.12.52.2.52.4.38.16-.1 2.56-1.74 3.6-2.44.72.1 1.48.16 2.24.16 5.52 0 10-3.48 10-7.86S17.52 3 12 3z" />
                </svg>
                카카오로 로그인
              </button>

              <button
                onClick={() => handleOAuthLogin("google-oidc")}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 로그인
              </button>

              <button
                onClick={() => handleOAuthLogin("naver")}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#03C75A] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <span className="text-lg font-bold">N</span>
                네이버로 로그인
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

            {/* Email Login Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="이메일"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    clearError()
                  }}
                  className="pl-10"
                  required
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    clearError()
                  }}
                  className="pl-10 pr-10"
                  required
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEmailLogin(e)
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary"
                disabled={isLoading}
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </Button>
            </form>

            {/* Bottom Links */}
            <div className="mt-4 space-y-2 text-center text-sm">
              <p className="text-muted-foreground">
                계정이 없으신가요?{" "}
                <Link
                  href="/sign-up"
                  onClick={closeLoginModal}
                  className="font-medium text-primary hover:underline"
                >
                  회원가입
                </Link>
              </p>
              <button
                onClick={() => {
                  setView("reset-request")
                  setError(null)
                }}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
          </div>
        )}

        {view === "reset-request" && (
          <div className="px-6 pb-6 pt-8">
            {/* Back button */}
            <button
              onClick={() => {
                setView("login")
                setError(null)
              }}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              로그인으로 돌아가기
            </button>

            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold">비밀번호 재설정</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                가입한 이메일을 입력하면<br />
                재설정 링크를 보내드립니다
              </p>
            </div>

            <form onSubmit={handleResetRequest} className="space-y-3">
              <div>
                <Label htmlFor="reset-email" className="sr-only">이메일</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="가입한 이메일 주소"
                    value={resetEmail}
                    onChange={(e) => {
                      setResetEmail(e.target.value)
                      clearError()
                    }}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "전송 중..." : "재설정 메일 보내기"}
              </Button>
            </form>
          </div>
        )}

        {view === "reset-sent" && (
          <div className="px-6 pb-6 pt-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <span className="text-2xl">✅</span>
              </div>
              <h2 className="text-xl font-bold">재설정 메일을 보냈습니다!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                메일함에서 재설정 링크를 클릭해주세요.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                메일이 안 왔다면 스팸함을 확인해주세요.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                재설정 링크는 24시간 동안 유효합니다.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendReset}
                disabled={isLoading}
              >
                {isLoading ? "전송 중..." : "재발송"}
              </Button>
              <button
                onClick={() => {
                  setView("login")
                  setError(null)
                }}
                className="block w-full text-center text-sm text-muted-foreground hover:text-primary"
              >
                로그인으로 돌아가기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
