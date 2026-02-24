"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { AlertCircle, Loader2 } from "lucide-react"
import { useBackHandler } from "@/lib/hooks/use-back-handler";

interface DeleteAccountDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
}

export function DeleteAccountDialog({
  isOpen,
  onOpenChange,
  userEmail,
}: DeleteAccountDialogProps) {
  const router = useRouter()
  useBackHandler(isOpen, () => onOpenChange(false));
  const [confirmEmail, setConfirmEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDeleteAccount = async () => {
    if (confirmEmail !== userEmail) {
      setError("입력한 이메일이 일치하지 않습니다.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "회원 탈퇴 중 오류가 발생했습니다.")
      }

      setSuccess(true)
      // 2초 후 홈으로 이동
      setTimeout(() => {
        router.push("/")
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원 탈퇴 중 오류가 발생했습니다.")
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isLoading) {
      onOpenChange(open)
      if (!open) {
        // 다이얼로그 닫을 때 상태 초기화
        setConfirmEmail("")
        setError(null)
        setSuccess(false)
      }
    }
  }

  const isConfirmDisabled = confirmEmail !== userEmail || isLoading

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md sm:rounded-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">회원 탈퇴</DialogTitle>
              <DialogDescription className="text-base mt-1">
                이 작업은 되돌릴 수 없습니다. 정말 탈퇴하시겠어요?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <span className="text-2xl">✓</span>
              </div>
              <div className="text-center">
                <p className="font-semibold text-green-900">탈퇴가 완료되었습니다</p>
                <p className="text-sm text-green-700">잠시 후 홈페이지로 이동합니다</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-destructive/5 p-4 border border-destructive/20">
              <p className="text-sm font-semibold text-destructive mb-3">
                ⚠️ 탈퇴 시 다음 항목이 모두 삭제됩니다:
              </p>
              <ul className="space-y-2 text-sm text-destructive/80">
                <li className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>프로필 정보 (이름, 이메일)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>즐겨찾기 목록 (병원/약국)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>옷장 정보 및 코디 기록</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-xs mt-1">•</span>
                  <span>스타일 설정</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="confirm-email" className="text-sm font-medium block mb-2">
                  탈퇴를 확인하기 위해 이메일을 입력해주세요:
                </label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder={userEmail}
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value)
                    setError(null)
                  }}
                  disabled={isLoading}
                  className={`${
                    error ? "border-destructive focus-visible:ring-destructive" : ""
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  autoComplete="off"
                />
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!success && (
          <DialogFooter className="flex gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              disabled={isConfirmDisabled}
              onClick={handleDeleteAccount}
              className="flex-1 sm:flex-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                "영구 탈퇴"
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}