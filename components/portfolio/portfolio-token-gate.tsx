"use client";

import { useState, useEffect } from "react";
import { Lock, KeyRound, Loader2, ArrowRight } from "lucide-react";

const STORAGE_KEY = "portfolio_token";

type GateState = "loading" | "input" | "verified";

export function PortfolioTokenGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>("loading");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      void verifyToken(saved, true);
    } else {
      setState("input");
    }
  }, []);

  async function verifyToken(value: string, silent = false) {
    if (!silent) setVerifying(true);
    setError("");

    try {
      const res = await fetch("/api/portfolio/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: value }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem(STORAGE_KEY, value);
        setState("verified");
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
        const message =
          typeof data?.error === "string"
            ? data.error
            : `인증 실패 (${res.status})`;
        setError(message);
        setState("input");
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
      setError("서버와 연결할 수 없습니다.");
      setState("input");
    } finally {
      setVerifying(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) {
      setError("토큰을 입력해 주세요.");
      return;
    }
    void verifyToken(trimmed);
  }

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "verified") {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">비공개 포트폴리오</h2>
          <p className="text-sm text-muted-foreground">
            이 페이지는 접근 토큰이 필요합니다.
            <br />
            이력서에 기재된 토큰을 입력해 주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (error) setError("");
              }}
              placeholder="접근 토큰 입력"
              autoFocus
              className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && <p className="text-center text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={verifying}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {verifying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                확인
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
