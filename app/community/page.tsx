"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { HomeTabNav } from "@/components/layout/home-tab-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search, Heart, MessageCircle, Eye,
  GraduationCap, Loader2, PenLine, Star,
  ImageIcon, ArrowUpDown,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { AdBanner } from "@/components/ad-banner"
import { AuthorTag } from "@/components/community/author-tag"
import { UserProfileSheet } from "@/components/community/user-profile-sheet"
import { toast } from "sonner"

interface Post {
  id: string
  user_id: string
  school_code: string
  schoolName: string
  title: string
  content: string
  image_urls: string[]
  like_count: number
  comment_count: number
  view_count: number
  author: string
  isLiked: boolean
  isOwner: boolean
  created_at: string
  enrollmentStatus: "enrolled" | "graduated" | null
  graduationYear: number | null
}

interface UserSchool {
  id: string
  school_code: string
  school_name: string
  is_primary: boolean
}

function formatDate(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
  }
  const diffHour = Math.floor((now.getTime() - date.getTime()) / 3600000)
  if (diffHour < 24) return `${diffHour}시간 전`
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, "0")}`
  }
  return `${date.getFullYear().toString().slice(2)}.${date.getMonth() + 1}.${String(date.getDate()).padStart(2, "0")}`
}

interface SchoolRank {
  school_code: string
  school_name: string
  posts: number
  likes: number
  views: number
  comments: number
  score: number
}

export default function CommunityPage() {
  const router = useRouter()

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mySchools, setMySchools] = useState<UserSchool[]>([])
  const [selectedSchool, setSelectedSchool] = useState("")
  const [sort, setSort] = useState("latest")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [user, setUser] = useState<any>(null)
  const [schoolsLoading, setSchoolsLoading] = useState(true)

  const [hotSchools, setHotSchools] = useState<SchoolRank[]>([])
  const [rankMode, setRankMode] = useState<"score" | "posts" | "likes">("score")
  const [weeklyAverages, setWeeklyAverages] = useState<{ posts: number; likes: number; comments: number; views: number } | null>(null)
  const [mySchoolStats, setMySchoolStats] = useState<{ posts: number; likes: number; comments: number; views: number } | null>(null)
  const [totalSchools, setTotalSchools] = useState(0)
  const [myEnrollment, setMyEnrollment] = useState<{ enrollment_status: string | null; graduation_year: number | null } | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadMySchools()
      else setSchoolsLoading(false)
    })
    loadRanking()
  }, [])

  const loadRanking = async (schoolCode?: string) => {
    try {
      const params = new URLSearchParams()
      if (schoolCode) params.set("schoolCode", schoolCode)
      const res = await fetch(`/api/community/ranking?${params}`)
      const data = await res.json()
      setHotSchools(data.ranking || [])
      setWeeklyAverages(data.averages || null)
      setMySchoolStats(data.mySchool || null)
      setTotalSchools(data.totalSchools || 0)
    } catch { toast.error("게시글을 불러오지 못했습니다") }
  }

  useEffect(() => {
    if (selectedSchool) loadRanking(selectedSchool)
  }, [selectedSchool])

  const loadMySchools = async () => {
    try {
      const res = await fetch("/api/school/register")
      const data = await res.json()
      const schools: UserSchool[] = data.schools || []
      setMySchools(schools)
      const primary = schools.find(s => s.is_primary)
      if (primary) setSelectedSchool(primary.school_code)
      else if (schools.length > 0) setSelectedSchool(schools[0].school_code)
    } catch { toast.error("학교 정보를 불러오지 못했습니다") }
    finally { setSchoolsLoading(false) }
  }

  useEffect(() => {
    if (!schoolsLoading && selectedSchool) loadPosts()
    else if (!schoolsLoading && !selectedSchool) setIsLoading(false)
  }, [selectedSchool, sort, page, schoolsLoading])

  const loadPosts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSchool) params.set("schoolCode", selectedSchool)
      params.set("sort", sort)
      params.set("page", String(page))
      if (searchQuery) params.set("search", searchQuery)
      const res = await fetch(`/api/community?${params}`)
      const data = await res.json()
      setPosts(data.posts || [])
      setTotalPages(data.totalPages || 1)
      if (data.myEnrollment !== undefined) setMyEnrollment(data.myEnrollment)
    } catch { toast.error("게시글을 불러오지 못했습니다") }
    finally { setIsLoading(false) }
  }

  const handleSearch = () => { setPage(1); loadPosts() }

  const handleSetPrimary = async (schoolCode: string) => {
    try {
      await fetch("/api/school/primary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolCode }),
      })
      setMySchools(prev => prev.map(s => ({ ...s, is_primary: s.school_code === schoolCode })))
    } catch { /* ignore */ }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <HomeTabNav />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-5xl flex gap-4">

            {/* ─── 메인 컨텐츠 ─── */}
            <div className="flex-1 min-w-0 space-y-4">

            {/* ─── 학교 탭 ─── */}
            {mySchools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {mySchools.map((s) => (
                  <button
                    key={s.school_code}
                    onClick={() => { setSelectedSchool(s.school_code); setPage(1) }}
                    onDoubleClick={() => handleSetPrimary(s.school_code)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                      selectedSchool === s.school_code
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {s.is_primary && <Star className="h-3 w-3 fill-current" />}
                    <GraduationCap className="h-3.5 w-3.5" />
                    {s.school_name}
                  </button>
                ))}
              </div>
            )}

            {/* ─── 검색 + 정렬 + 글쓰기 ─── */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="제목/내용 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="h-9 pl-10 text-sm"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 shrink-0 h-9"
                onClick={() => { setSort(sort === "latest" ? "popular" : "latest"); setPage(1) }}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sort === "latest" ? "최신순" : "인기순"}
              </Button>
              {user && (
                <Button
                  size="sm"
                  className="gap-1 shrink-0 h-9"
                  onClick={() => router.push("/community/write")}
                >
                  <PenLine className="h-3.5 w-3.5" />
                  글쓰기
                </Button>
              )}
            </div>

            {/* ─── 게시글 테이블 ─── */}
            {isLoading ? (
              <div className="space-y-0 border rounded-lg overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={`px-3 py-3 ${i > 0 ? "border-t" : ""}`}>
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GraduationCap className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">게시글이 없습니다</p>
                <p className="mt-1 text-xs text-muted-foreground/60">첫 번째 글을 작성해보세요!</p>
                {user && (
                  <Button size="sm" className="mt-4 gap-1" onClick={() => router.push("/community/write")}>
                    <PenLine className="h-3.5 w-3.5" /> 글쓰기
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  {/* 데스크톱 테이블 헤더 */}
                  <div className="hidden sm:grid sm:grid-cols-[1fr_80px_50px_50px_65px] border-b bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                    <span>제목</span>
                    <span className="text-center">작성자</span>
                    <span className="text-center">조회</span>
                    <span className="text-center">추천</span>
                    <span className="text-center">날짜</span>
                  </div>

                  {/* 게시글 행 */}
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                  >
                  {posts.map((post, i) => {
                    const hasImage = post.image_urls && post.image_urls.length > 0
                    const thumbUrl = hasImage ? post.image_urls[0] : null

                    return (
                      <motion.div
                        key={post.id}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
                        }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push(`/community/${post.id}`)}
                        className={`cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/50 ${i > 0 ? "border-t" : "sm:border-t-0"}`}
                      >
                        {/* 데스크톱 행 */}
                        <div className="hidden sm:grid sm:grid-cols-[1fr_80px_50px_50px_65px] items-center px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {thumbUrl && (
                              <div className="shrink-0 h-8 w-8 rounded overflow-hidden bg-muted border">
                                <img src={thumbUrl} alt={`${post.title} 첨부 이미지`} className="h-full w-full object-cover" loading="lazy" />
                              </div>
                            )}
                            {hasImage && !thumbUrl && (
                              <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                            )}
                            <span className="truncate text-sm">{post.title}</span>
                            {post.comment_count > 0 && (
                              <span className="shrink-0 text-[11px] font-bold text-primary">[{post.comment_count}]</span>
                            )}
                            <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {post.schoolName}
                            </span>
                          </div>
                          <span className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <button onClick={(e) => { e.stopPropagation(); setProfileUserId(post.user_id); setShowProfile(true); }} className="truncate hover:underline">
                              {post.author}
                            </button>
                            <AuthorTag enrollmentStatus={post.enrollmentStatus} graduationYear={post.graduationYear} myEnrollment={myEnrollment} isOwner={post.isOwner} />
                          </span>
                          <span className="text-center text-xs text-muted-foreground">{post.view_count}</span>
                          <span className={`text-center text-xs ${post.like_count > 0 ? "font-semibold text-red-500" : "text-muted-foreground"}`}>{post.like_count}</span>
                          <span className="text-center text-xs text-muted-foreground">{formatDate(post.created_at)}</span>
                        </div>

                        {/* 모바일 행 */}
                        <div className="flex items-start gap-3 px-3 py-3 sm:hidden">
                          {thumbUrl && (
                            <div className="shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-muted border">
                              <img src={thumbUrl} alt={`${post.title} 첨부 이미지`} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium truncate">{post.title}</p>
                              {post.comment_count > 0 && (
                                <span className="shrink-0 text-[11px] font-bold text-primary">[{post.comment_count}]</span>
                              )}
                              {hasImage && !thumbUrl && (
                                <ImageIcon className="h-3 w-3 shrink-0 text-blue-400" />
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="max-w-[80px] truncate rounded bg-muted px-1 py-0.5 text-[10px] font-medium">{post.schoolName}</span>
                              <button onClick={(e) => { e.stopPropagation(); setProfileUserId(post.user_id); setShowProfile(true); }} className="max-w-[60px] truncate hover:underline">
                                {post.author}
                              </button>
                              <AuthorTag enrollmentStatus={post.enrollmentStatus} graduationYear={post.graduationYear} myEnrollment={myEnrollment} isOwner={post.isOwner} />
                              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{post.view_count}</span>
                              <span className={`flex items-center gap-0.5 ${post.like_count > 0 ? "text-red-500" : ""}`}>
                                <Heart className={`h-3 w-3 ${post.like_count > 0 ? "fill-red-500" : ""}`} />{post.like_count}
                              </span>
                              <span>{formatDate(post.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                  </motion.div>
                </div>

                {/* 페이징 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1 pt-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) pageNum = i + 1
                      else if (page <= 3) pageNum = i + 1
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i
                      else pageNum = page - 2 + i
                      return (
                        <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setPage(pageNum)}>
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
                  </div>
                )}
              </>
            )}

          <AdBanner className="mt-4" />

          </div>

            {/* ─── 사이드바 (데스크톱만) ─── */}
            <aside className="hidden lg:block w-64 shrink-0 space-y-4">

              {/* 🔥 핫한 학교 */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">🔥 핫한 학교</span>
                  <div className="flex gap-1">
                    {(["score", "posts", "likes"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setRankMode(m)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          rankMode === m
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {m === "score" ? "종합" : m === "posts" ? "게시글" : "좋아요"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="divide-y">
                  {hotSchools.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      아직 데이터가 없습니다
                    </div>
                  ) : (
                    [...hotSchools]
                      .sort((a, b) =>
                        rankMode === "likes" ? b.likes - a.likes :
                        rankMode === "posts" ? b.posts - a.posts :
                        b.score - a.score
                      )
                      .slice(0, 10)
                      .map((school, i) => {
                        const value = rankMode === "likes" ? school.likes :
                                      rankMode === "posts" ? school.posts :
                                      school.score
                        const prev = i > 0 ? (
                          rankMode === "likes" ? hotSchools[i-1]?.likes :
                          rankMode === "posts" ? hotSchools[i-1]?.posts :
                          hotSchools[i-1]?.score
                        ) : undefined

                        return (
                          <div
                            key={school.school_code}
                            className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => {
                              setSelectedSchool(school.school_code)
                              setPage(1)
                            }}
                          >
                            <span className={`w-4 text-center text-[11px] font-bold ${
                              i === 0 ? "text-red-500" :
                              i === 1 ? "text-orange-500" :
                              i === 2 ? "text-yellow-500" :
                              "text-muted-foreground"
                            }`}>
                              {i + 1}
                            </span>
                            <span className="flex-1 text-xs truncate">{school.school_name}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {value} {rankMode === "likes" ? "❤️" : rankMode === "posts" ? "글" : "point"}
                            </span>
                          </div>
                        )
                      })
                  )}
                </div>
                <div className="border-t px-3 py-1.5 text-center">
                  <span className="text-[10px] text-muted-foreground">최근 7일 기준</span>
                </div>
              </div>

              {/* 📊 주간 활동 비교 */}
              {weeklyAverages && (weeklyAverages.posts > 0 || weeklyAverages.likes > 0 || weeklyAverages.comments > 0) && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2">
                    <span className="text-xs font-bold text-foreground">
                      📊 주간 활동{mySchoolStats ? " 비교" : ""}
                    </span>
                  </div>
                  <div className="divide-y">
                    {([
                      { label: "게시글", key: "posts" as const, unit: "건" },
                      { label: "좋아요", key: "likes" as const, unit: "개" },
                      { label: "댓글", key: "comments" as const, unit: "개" },
                    ]).map(({ label, key, unit }) => {
                      const avg = weeklyAverages[key]
                      const my = mySchoolStats?.[key]
                      const diff = my !== undefined ? my - avg : null
                      const pct = diff !== null && avg > 0 ? Math.round((diff / avg) * 100) : null

                      return (
                        <div key={key} className="px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                            <span className="text-[10px] text-muted-foreground">
                              평균 {avg}{unit}
                            </span>
                          </div>
                          {my !== undefined && (
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-sm font-bold">우리 학교 {my}{unit}</span>
                              {diff !== null && (
                                <span className={`text-xs font-semibold ${
                                  diff > 0 ? "text-red-500" : diff < 0 ? "text-blue-500" : "text-muted-foreground"
                                }`}>
                                  {diff > 0 ? "▲" : diff < 0 ? "▼" : "—"}
                                  {pct !== null
                                    ? ` ${diff > 0 ? "+" : ""}${pct}%`
                                    : diff !== 0
                                      ? ` ${diff > 0 ? "+" : ""}${diff}`
                                      : ""}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t px-3 py-1.5 text-center">
                    <span className="text-[10px] text-muted-foreground">
                      전체 {totalSchools}개 학교 · 최근 7일
                    </span>
                  </div>
                </div>
              )}

            </aside>
          </div>
        </div>
      </main>
      <MobileNav />
      <UserProfileSheet
        open={showProfile}
        onOpenChange={setShowProfile}
        userId={profileUserId}
        schoolCode={selectedSchool}
      />
    </div>
  )
}
