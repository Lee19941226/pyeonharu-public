"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Send, GraduationCap, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import type { RichEditorRef } from "@/components/editor/rich-editor";

const RichEditor = dynamic(() => import("@/components/editor/rich-editor"), {
  ssr: false,
});

interface UserSchool {
  school_code: string;
  school_name: string;
  is_primary: boolean;
}

function CommunityWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const [mySchools, setMySchools] = useState<UserSchool[]>([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [title, setTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const editorRef = useRef<RichEditorRef>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        toast.error("로그인이 필요합니다");
        router.push("/login");
        return;
      }
      loadMySchools();
    });

    if (isEdit) loadPost();
    else setIsLoading(false);
  }, []);

  const loadMySchools = async () => {
    try {
      const res = await fetch("/api/school/register");
      const data = await res.json();
      const schools: UserSchool[] = data.schools || [];
      setMySchools(schools);

      if (!isEdit) {
        const primary = schools.find((s) => s.is_primary);
        setSelectedSchool(
          primary?.school_code || schools[0]?.school_code || "",
        );
      }
    } catch {
      /* ignore */
    }
  };

  const loadPost = async () => {
    try {
      const res = await fetch(`/api/community/${editId}`);
      const data = await res.json();
      if (data.post) {
        setSelectedSchool(data.post.school_code);
        setTitle(data.post.title);
        setInitialContent(data.post.content);
      }
    } catch {
      toast.error("게시글을 불러올 수 없습니다");
      router.push("/community");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("files", file);
    try {
      const res = await fetch("/api/community/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.urls?.length > 0) return data.urls[0];
      toast.error(data.error || "업로드 실패");
      return null;
    } catch {
      toast.error("이미지 업로드 실패");
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedSchool) {
      toast.error("학교를 선택해주세요");
      return;
    }
    if (!title.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }

    const content = editorRef.current?.getHTML() || "";
    const imageUrls = editorRef.current?.getImageUrls() || [];

    if (editorRef.current?.isEmpty()) {
      toast.error("내용을 입력해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/community/${editId}` : "/api/community";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: selectedSchool,
          title,
          content,
          imageUrls,
        }),
      });

      const data = await res.json();
      if (data.success || data.post) {
        toast.success(
          isEdit ? "게시글이 수정되었습니다" : "게시글이 작성되었습니다",
        );
        router.push(
          isEdit ? `/community/${editId}` : `/community/${data.post.id}`,
        );
      } else {
        toast.error(data.error || "작성 실패");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 py-4">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">
                {isEdit ? "글 수정" : "글쓰기"}
              </h1>
            </div>

            {/* 학교 선택 */}
            <div>
              <p className="mb-2 text-sm font-medium">학교</p>
              <div className="flex flex-wrap gap-2">
                {mySchools.map((s) => (
                  <button
                    key={s.school_code}
                    onClick={() => setSelectedSchool(s.school_code)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
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
              {mySchools.length === 0 && (
                <div className="mt-2 rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100">
                      <GraduationCap className="h-4 w-4 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        등록된 학교가 없습니다
                      </p>
                      <p className="text-xs text-muted-foreground">
                        글을 작성하려면 학교를 먼저 등록해주세요
                      </p>
                    </div>
                    <Link href="/school">
                      <Button size="sm" variant="outline" className="shrink-0 border-orange-300 text-orange-600 hover:bg-orange-100">
                        학교 등록
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* 제목 */}
            <div>
              <p className="mb-2 text-sm font-medium">제목</p>
              <Input
                placeholder="제목을 입력하세요"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* 본문 에디터 */}
            <div>
              <p className="mb-2 text-sm font-medium">내용</p>
              <RichEditor
                ref={editorRef}
                initialContent={initialContent}
                onImageUpload={handleImageUpload}
                placeholder="'/' 를 입력하여 명령어를 사용하세요..."
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || mySchools.length === 0}
              className="w-full gap-1.5"
              size="lg"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitting ? "제출 중..." : isEdit ? "수정하기" : "작성하기"}
            </Button>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}

export default function CommunityWritePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CommunityWriteContent />
    </Suspense>
  );
}
