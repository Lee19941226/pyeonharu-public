"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      letter: /[a-zA-Z]/.test(password),
      number: /[0-9]/.test(password),
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms || !agreePrivacy) {
      setError("이용약관과 개인정보처리방침에 동의해주세요.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!isPasswordValid) {
      setError("비밀번호 조건을 충족해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("회원가입에 실패했습니다. 다시 시도해주세요.");
      setIsLoading(false);
      return;
    }

    // 이미 가입된 이메일 체크 (Supabase는 error 대신 빈 identities를 반환)
    if (
      data.user &&
      data.user.identities &&
      data.user.identities.length === 0
    ) {
      setError("이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.");
      setIsLoading(false);
      return;
    }

    // 이메일 인증 안내 페이지로 이동
    router.push("/signup/verify");
  };

  const handleOAuthLogin = async (provider: "google" | "kakao" | "naver") => {
    if (!agreeTerms || !agreePrivacy) {
      setError("이용약관과 개인정보처리방침에 동의해주세요.");
      return;
    }

    setIsOAuthLoading(provider);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(`${provider} 회원가입에 실패했습니다. 다시 시도해주세요.`);
      setIsOAuthLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">
                편
              </span>
            </div>
            <span className="text-xl font-bold">편하루</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              편하루에 가입하고 편리한 서비스를 이용하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Terms Agreement */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">약관 동의</p>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) =>
                    setAgreeTerms(checked as boolean)
                  }
                />
                <Label htmlFor="terms" className="text-sm">
                  <Link href="/terms" className="text-primary hover:underline">
                    이용약관
                  </Link>
                  에 동의합니다 (필수)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privacy"
                  checked={agreePrivacy}
                  onCheckedChange={(checked) =>
                    setAgreePrivacy(checked as boolean)
                  }
                />
                <Label htmlFor="privacy" className="text-sm">
                  <Link
                    href="/privacy"
                    className="text-primary hover:underline"
                  >
                    개인정보처리방침
                  </Link>
                  에 동의합니다 (필수)
                </Label>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthLogin("google")}
                disabled={isOAuthLoading !== null}
              >
                {isOAuthLoading === "google" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Google로 가입하기
              </Button>

              <Button
                variant="outline"
                className="w-full bg-[#FEE500] text-[#000000] hover:bg-[#FEE500]/90 hover:text-[#000000]"
                onClick={() => handleOAuthLogin("kakao")}
                disabled={isOAuthLoading !== null}
              >
                {isOAuthLoading === "kakao" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.9 5.36 4.74 6.75-.16.57-.58 2.07-.67 2.39-.1.4.15.39.31.28.13-.08 2.02-1.37 2.84-1.93.88.13 1.79.2 2.73.2 5.52 0 10-3.58 10-8 0-4.42-4.48-8-10-8z"
                    />
                  </svg>
                )}
                카카오로 가입하기
              </Button>

              <Button
                variant="outline"
                className="w-full bg-[#03C75A] text-white hover:bg-[#03C75A]/90"
                onClick={() => handleOAuthLogin("naver")}
                disabled={isOAuthLoading !== null}
              >
                {isOAuthLoading === "naver" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z"
                    />
                  </svg>
                )}
                네이버로 가입하기
              </Button>
            </div>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                또는 이메일로 가입
              </span>
            </div>

            {/* Email Signup Form */}
            <form onSubmit={handleSignup} className="space-y-4">
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
                    name="name"
                    type="text"
                    placeholder="홍길동"
                    value={formData.name}
                    onChange={handleChange}
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
                    name="email"
                    type="email"
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {formData.password && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.length ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <Check className="h-3 w-3" />
                      8자 이상
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.letter ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <Check className="h-3 w-3" />
                      영문 포함
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.number ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      <Check className="h-3 w-3" />
                      숫자 포함
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
                {formData.confirmPassword &&
                  formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-destructive">
                      비밀번호가 일치하지 않습니다.
                    </p>
                  )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !agreeTerms || !agreePrivacy}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    가입 중...
                  </>
                ) : (
                  "가입하기"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
