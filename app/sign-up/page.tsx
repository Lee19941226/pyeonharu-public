"use client"

import React from "react"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, User, Eye, EyeOff, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordRequirements = [
    { met: password.length >= 8, text: "8자 이상" },
    { met: /[A-Za-z]/.test(password), text: "영문 포함" },
    { met: /[0-9]/.test(password), text: "숫자 포함" },
  ]

  const isPasswordValid = passwordRequirements.every((req) => req.met)
  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isPasswordValid) {
      setError("비밀번호 조건을 확인해주세요.")
      return
    }
    
    if (!doPasswordsMatch) {
      setError("비밀번호가 일치하지 않습니다.")
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/`,
        data: {
          name,
        },
      },
    })

    if (error) {
      if (error.message.includes("already registered")) {
        setError("이미 가입된 이메일입니다.")
      } else {
        setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.")
      }
      setIsLoading(false)
      return
    }

    router.push("/sign-up-success")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-xl font-bold text-primary-foreground">편</span>
        </div>
        <span className="text-2xl font-bold">편하루</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <CardDescription>
            편하루 계정을 만들고 더 많은 기능을 이용하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  </span>
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {passwordRequirements.map((req) => (
                  <span
                    key={req.text}
                    className={`flex items-center gap-1 ${
                      req.met ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    {req.text}
                  </span>
                ))}
              </div>
            </div>

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
                    doPasswordsMatch ? "text-primary" : "text-destructive"
                  }`}
                >
                  {doPasswordsMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
            >
              {isLoading ? "가입 중..." : "회원가입"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
