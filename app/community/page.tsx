"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search, Heart, MessageCircle, Eye, ChevronRight,
  GraduationCap, Loader2, PenLine, School, Star,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Post {
  id: string
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
}

interface UserSchool {
  id: string
  school_code: string
  school_name: string
  is_primary: boolean
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diff < 60) return "방금"
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) loadMySchools()
      else setSchoolsLoading(false)
    })
  }, [])

  const loadMySchools = async () => {
    try {
      const res = await fetch("/api/school/register")
      const data = await res.json()
      const schools: UserSchool[] = data.schools || []
      setMySchools(schools)

      // 메인 학교가 있으면 기본 선택
      const primary = schools.find(s => s.is_primary)
      if (primary) {
        setSelectedSchool(primary.school_code)
      } else if (schools.length > 0) {
        setSelectedSchool(schools[0].school_code)
      }
    } catch { /* ignore */ }
    finally { setSchoolsLoading(false) }
  }

  useEffect(() => {
    if (!schoolsLoading && selectedSchool) {
      loadPosts()
    } else if (!schoolsLoading && !selectedSchool) {
      setIsLoading(false)
    }
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
    } catch { /* ignore */ }
    finally { setIsLoading(false) }
  }

  const handleSearch = () => {
    setPage(1)
    loadPosts()
  }

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

  const selectedSchoolName = mySchools.find(s => s.school_code === selectedSchool)?.school_name || ""

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">

            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">커뮤니티</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedSchoolName ? `${selectedSchoolName} 게시판` : "학교를 등록하면 커뮤니티를 이용할 수 있어요"}
                </p>
              </div>
              {user && mySchools.length > 0 && (
                <Button onClick={() => router.push("/community/write")} size="sm" className="gap-1.5">
                  <PenLine className="h-4 w-4" />
                  글쓰기
                </Button>
              )}
            </div>

            {/* 학교 미등록 상태 */}
            {!schoolsLoading && user && mySchools.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                      <School className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">학교를 등록해주세요</p>
                      <p className="text-xs text-muted-foreground">학교를 등록하면 해당 학교 커뮤니티에 참여할 수 있어요</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => router.push("/school")}>등록하기</Button>
                </CardContent>
              </Card>
            )}

            {/* 비로그인 */}
            {!schoolsLoading && !user && (
              <Card className="border-dashed">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="text-sm text-muted-foreground">로그인하고 학교 커뮤니티에 참여하세요</p>
                  <Button size="sm" variant="outline" onClick={() => router.push("/login")}>로그인</Button>
                </CardContent>
              </Card>
            )}

            {/* 학교 탭 */}
            {mySchools.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {mySchools.map(s => (
                  <button
                    key={s.school_code}
                    onClick={() => { setSelectedSchool(s.school_code); setPage(1) }}
                    onDoubleClick={() => handleSetPrimary(s.school_code)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedSchool === s.school_code
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted"
                    }`}
                    title={s.is_primary ? "메인 학교" : "더블클릭으로 메인 학교 설정"}
                  >
                    {s.is_primary && <Star className="h-3 w-3 fill-current" />}
                    <GraduationCap className="h-3.5 w-3.5" />
                    {s.school_name}
                  </button>
                ))}
              </div>
            )}

            {/* 검색 + 정렬 */}
            {mySchools.length > 0 && (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="제목이나 내용으로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="h-9 pl-10 text-sm"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1) }}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                >
                  <option value="latest">최신순</option>
                  <option value="popular">인기순</option>
                </select>
              </div>
            )}

            {/* 게시글 목록 */}
            {mySchools.length > 0 && (
              <>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <MessageCircle className="mb-3 h-12 w-12 text-muted-foreground/30" />
                    <p className="text-sm font-medium">아직 게시글이 없습니다</p>
                    <p className="text-xs text-muted-foreground">{selectedSchoolName}의 첫 번째 글을 작성해보세요!</p>
                    {user && (
                      <Button size="sm" className="mt-3" onClick={() => router.push("/community/write")}>
                        글쓰기
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {posts.map(post => (
                      <Card
                        key={post.id}
                        className="cursor-pointer border shadow-none transition-colors hover:bg-muted/50 active:bg-muted/70"
                        onClick={() => router.push(`/community/${post.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="mb-1.5 flex items-start gap-2">
                            <h3 className="flex-1 text-sm font-medium leading-tight line-clamp-1">
                              {post.title}
                            </h3>
                            {post.image_urls?.length > 0 && (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                사진 {post.image_urls.length}
                              </Badge>
                            )}
                          </div>

                          <p className="mb-2 text-xs text-muted-foreground line-clamp-2">
                            {post.content.replace(/<[^>]*>/g, "").slice(0, 100)}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-3">
                              <span>{post.author}</span>
                              <span>{timeAgo(post.created_at)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-0.5">
                                <Heart className={`h-3 w-3 ${post.isLiked ? "fill-red-500 text-red-500" : ""}`} />
                                {post.like_count}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <MessageCircle className="h-3 w-3" />
                                {post.comment_count}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Eye className="h-3 w-3" />
                                {post.view_count}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* 페이징 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>이전</Button>
                    <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
