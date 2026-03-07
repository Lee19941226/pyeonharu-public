"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AuthorTag } from "@/components/community/author-tag"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, Calendar, AlertTriangle } from "lucide-react"

interface UserProfileSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string | null
  schoolCode: string
}

interface ProfileData {
  nickname: string
  avatarUrl: string | null
  joinedAt: string
  enrollmentStatus: "enrolled" | "graduated" | null
  graduationYear: number | null
  enrollmentYear: number | null
  postCount: number
  allergies: string[]
  myEnrollment: { enrollment_status: string | null; graduation_year: number | null } | null
  isMe: boolean
}

export function UserProfileSheet({ open, onOpenChange, userId, schoolCode }: UserProfileSheetProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && userId) {
      loadProfile()
    } else {
      setProfile(null)
    }
  }, [open, userId])

  const loadProfile = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/community/user-profile/${userId}?schoolCode=${encodeURIComponent(schoolCode)}`)
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
      }
    } catch {
      // 조용히 실패
    } finally {
      setIsLoading(false)
    }
  }

  const formatJoinDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">프로필</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-4 py-2">
            {/* 아바타 + 닉네임 + 태그 */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.nickname}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  profile.nickname.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{profile.nickname}</span>
                  {profile.isMe && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">나</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <AuthorTag
                    enrollmentStatus={profile.enrollmentStatus}
                    graduationYear={profile.graduationYear}
                    myEnrollment={profile.isMe ? null : profile.myEnrollment}
                    isOwner={profile.isMe}
                  />
                </div>
              </div>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">게시글</p>
                  <p className="text-sm font-semibold">{profile.postCount}개</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">가입일</p>
                  <p className="text-sm font-semibold">{formatJoinDate(profile.joinedAt)}</p>
                </div>
              </div>
            </div>

            {/* 알레르기 정보 (공개 설정된 경우) */}
            {profile.allergies.length > 0 && (
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  알레르기 정보
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.allergies.map(a => (
                    <span key={a} className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
