"use client"

import React from "react"
import Link from "next/link"
import { useState } from "react"
import { Mail, Loader2, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError("비밀번호 재설정 이메일 발송에 실패했습니다.")
      setIsLoading(false)
      return
    }

    setIsSuccess(true)
    setIsLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">편</span>
            </div>
            <span className="text-xl font-bold">편하루</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          {isSuccess ? (
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl">이메일을 확인해주세요</CardTitle>
                <CardDescription>
                  비밀번호 재설정 링크가 포함된 이메일을 발송했습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>{email}</strong>로 이메일을 발송했습니다.
                    이메일이 도착하지 않았다면 스팸 메일함을 확인해주세요.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/login">
                    로그인 페이지로 돌아가기
                  </Link>
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">비밀번호 재설정</CardTitle>
                <CardDescription>
                  가입 시 사용한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

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

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        발송 중...
                      </>
                    ) : (
                      "재설정 링크 받기"
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    로그인으로 돌아가기
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </main>
    </div>
  )
}
