"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ModalView = "login" | "reset-password";

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const router = useRouter();
  const [view, setView] = useState<ModalView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
        } else {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        return;
      }

      handleClose();
      onSuccess?.();
      router.refresh();
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError("비밀번호 재설정 이메일 발송에 실패했습니다.");
        return;
      }

      setResetEmailSent(true);
    } catch {
      setError("오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "kakao" | "google" | "naver") => {
    setIsLoading(true);
    setError(null);

    try {
      if (provider === "naver") {
        // 네이버는 Supabase 미지원 → 서버 라우트로 처리
        window.location.href = `/api/auth/naver`;
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError("소셜 로그인 중 오류가 발생했습니다.");
      }
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setView("login");
    setResetEmailSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[360px] p-6">
        {view === "login" ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-xl">로그인</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* OAuth 버튼들 */}
              <div className="space-y-2">
                <Button
                  type="button"
                  className="w-full bg-[#FEE500] text-[#191919] hover:bg-[#FEE500]/90"
                  onClick={() => handleOAuthLogin("kakao")}
                  disabled={isLoading}
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 3C6.48 3 2 6.48 2 10.5c0 2.52 1.64 4.74 4.12 6.02-.18.64-.66 2.32-.76 2.68-.12.44.16.43.34.31.14-.09 2.26-1.52 3.18-2.14.36.04.74.06 1.12.06 5.52 0 10-3.48 10-7.5S17.52 3 12 3z" />
                  </svg>
                  카카오로 로그인
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={isLoading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google로 로그인
                </Button>

                <Button
                  type="button"
                  className="w-full bg-[#03C75A] text-white hover:bg-[#03C75A]/90"
                  onClick={() => handleOAuthLogin("naver")}
                  disabled={isLoading}
                >
                  <span className="mr-2 flex h-5 w-5 items-center justify-center font-bold">
                    N
                  </span>
                  네이버로 로그인
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    또는
                  </span>
                </div>
              </div>

              {/* 이메일 로그인 */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">
                    이메일
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 pl-10 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs">
                      비밀번호
                    </Label>
                    <button
                      type="button"
                      onClick={() => setView("reset-password")}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="비밀번호"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-9 pl-10 pr-10 text-sm"
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
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "로그인 중..." : "로그인"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground">
                계정이 없으신가요?{" "}
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    router.push("/sign-up");
                  }}
                  className="font-medium text-primary hover:underline"
                >
                  회원가입
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setView("login");
                    setResetEmailSent(false);
                    setError(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <DialogTitle className="text-lg">비밀번호 재설정</DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {resetEmailSent ? (
                <div className="text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="text-sm">
                    <strong>{email}</strong>으로
                    <br />
                    비밀번호 재설정 링크를 보냈습니다.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    이메일을 확인해주세요.
                  </p>
                  <Button onClick={handleClose} className="w-full">
                    확인
                  </Button>
                </div>
              ) : (
                <>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <p className="text-sm text-muted-foreground">
                    가입한 이메일을 입력하시면 비밀번호 재설정 링크를
                    보내드립니다.
                  </p>

                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="reset-email" className="text-xs">
                        이메일
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="example@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-9 pl-10 text-sm"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? "발송 중..." : "재설정 링크 보내기"}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
