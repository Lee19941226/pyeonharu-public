"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeOff, Check, X as XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const passwordRequirements = [
    { met: password.length >= 8, text: "8자 이상" },
    { met: /[A-Z]/.test(password), text: "대문자" },
    { met: /[0-9]/.test(password), text: "숫자" },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: "특수문자" },
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.met)
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid || !doPasswordsMatch) return

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      if (updateError.message.includes("expired") || updateError.message.includes("invalid")) {
        setError("링크가 만료되었습니다. 다시 요청해주세요.")
      } else {
        setError("비밀번호 변경 중 오류가 발생했습니다.")
      }
      setIsLoading(false)
      return
    }

    setSuccess(true)
    setIsLoading(false)

    // 3초 후 홈으로 이동
    setTimeout(() => {
      router.push("/")
    }, 3000)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-xl font-bold text-primary-foreground">편</span>
        </div>
        <span className="text-2xl font-bold">편하루</span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-lg">
        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">비밀번호가 변경되었습니다!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              잠시 후 홈으로 이동합니다...
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="text-3xl">🔑</span>
              </div>
              <h1 className="text-2xl font-bold">새 비밀번호 설정</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                새로운 비밀번호를 입력해주세요
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">새 비밀번호</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="새 비밀번호"
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
                      {req.met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <XIcon className="h-3 w-3" />
                      )}
                      {req.text}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호 확인"
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
                      ? "✓ 비밀번호가 일치합니다"
                      : "✗ 비밀번호가 일치하지 않습니다"}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
              >
                {isLoading ? "변경 중..." : "비밀번호 변경하기"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
