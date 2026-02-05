"use client"

import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface BookmarkButtonProps {
  type: "hospital" | "pharmacy"
  id: string
  name: string
  address?: string
  phone?: string
  category?: string
  lat?: number
  lng?: number
  size?: "sm" | "md"
  className?: string
}

export function BookmarkButton({
  type,
  id,
  name,
  address = "",
  phone = "",
  category = "",
  lat = 0,
  lng = 0,
  size = "sm",
  className,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checked, setChecked] = useState(false)

  // 마운트 시 즐겨찾기 여부 확인
  useEffect(() => {
    const checkBookmark = async () => {
      try {
        const res = await fetch(`/api/bookmarks/check?type=${type}&id=${id}`)
        const data = await res.json()
        setBookmarked(data.bookmarked)
      } catch {
        // 비로그인이면 무시
      } finally {
        setChecked(true)
      }
    }
    checkBookmark()
  }, [type, id])

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      if (bookmarked) {
        // 삭제
        const res = await fetch(`/api/bookmarks?type=${type}&id=${id}`, {
          method: "DELETE",
        })
        if (res.ok) setBookmarked(false)
      } else {
        // 추가
        const res = await fetch("/api/bookmarks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, id, name, address, phone, category, lat, lng }),
        })
        if (res.ok) {
          setBookmarked(true)
        } else if (res.status === 401) {
          // 비로그인 시 안내
          alert("로그인이 필요합니다.")
        } else if (res.status === 409) {
          // 이미 추가됨
          setBookmarked(true)
        }
      }
    } catch {
      console.error("Bookmark toggle failed")
    } finally {
      setLoading(false)
    }
  }

  if (!checked) return null

  const sizeClass = size === "md" ? "h-9 w-9" : "h-8 w-8"

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        sizeClass,
        "shrink-0 transition-all",
        bookmarked && "text-rose-500 hover:text-rose-600",
        !bookmarked && "text-muted-foreground hover:text-rose-400",
        className,
      )}
      onClick={handleToggle}
      disabled={loading}
    >
      <Heart
        className={cn(
          size === "md" ? "h-5 w-5" : "h-4 w-4",
          bookmarked && "fill-current",
        )}
      />
      <span className="sr-only">
        {bookmarked ? "즐겨찾기 해제" : "즐겨찾기 추가"}
      </span>
    </Button>
  )
}
