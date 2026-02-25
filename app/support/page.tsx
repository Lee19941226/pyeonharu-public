"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Loader2,
  Send,
  Mail,
  CheckCircle,
  Clock,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { RichEditorRef } from "@/components/editor/rich-editor";

const RichEditor = dynamic(() => import("@/components/editor/rich-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-lg border">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

const CATEGORIES = [
  { value: "bug", label: "버그 신고", emoji: "🐛" },
  { value: "feature", label: "기능 제안", emoji: "💡" },
  { value: "account", label: "계정 문제", emoji: "🔐" },
  { value: "allergy", label: "알레르기 정보 오류", emoji: "⚠️" },
  { value: "general", label: "일반 문의", emoji: "💬" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "접수됨", color: "bg-yellow-100 text-yellow-800" },
  in_progress: { label: "처리 중", color: "bg-blue-100 text-blue-800" },
  resolved: { label: "답변 완료", color: "bg-green-100 text-green-800" },
};

interface Inquiry {
  id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

function SupportContent() {
  const router = useRouter();
  const editorRef = useRef<RichEditorRef>(null);

  const [user, setUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // 폼 상태
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 내 문의 목록
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [showInquiries, setShowInquiries] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        setName(
          user.user_metadata?.name ||
            user.user_metadata?.full_name ||
            "",
        );
        setEmail(user.email || "");
      }
      setAuthChecked(true);
    });
  }, []);

  const loadInquiries = async () => {
    if (!user) return;
    setLoadingInquiries(true);
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (data.success) setInquiries(data.inquiries || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleToggleInquiries = () => {
    if (!showInquiries && inquiries.length === 0) loadInquiries();
    setShowInquiries(!showInquiries);
  };

  // 이미지 업로드 (커뮤니티와 같은 엔드포인트 재활용)
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
    if (!name.trim()) return toast.error("이름을 입력해주세요");
    if (!email.trim()) return toast.error("이메일을 입력해주세요");
    if (!title.trim()) return toast.error("제목을 입력해주세요");

    const content = editorRef.current?.getHTML() || "";
    if (editorRef.current?.isEmpty()) return toast.error("내용을 입력해주세요");

    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, category, title, content }),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        toast.success("문의가 접수되었습니다!");
      } else {
        toast.error(data.error || "문의 접수에 실패했습니다");
      }
    } catch {
      toast.error("오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  // 접수 완료 화면
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold">문의가 접수되었습니다</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              빠른 시일 내에 확인 후 답변드리겠습니다.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setSubmitted(false)} variant="outline">
                추가 문의하기
              </Button>
              <Button onClick={() => router.push("/")}>홈으로</Button>
            </div>
          </div>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto max-w-2xl px-4 py-6">
          {/* 헤더 */}
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로가기
            </button>
            <h1 className="text-2xl font-bold">고객센터</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              문의사항이나 피드백을 남겨주세요. 빠르게 확인하겠습니다.
            </p>
          </div>

          {/* 연락처 안내 */}
          <Card className="mb-6">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">이메일 문의도 가능합니다</p>
                <p className="text-xs text-muted-foreground">
                  pyeonharu@gmail.com
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 내 문의 내역 (로그인 시) */}
          {user && (
            <div className="mb-6">
              <button
                onClick={handleToggleInquiries}
                className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  내 문의 내역
                  {inquiries.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {inquiries.length}
                    </span>
                  )}
                </span>
                {showInquiries ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {showInquiries && (
                <div className="mt-2 space-y-2">
                  {loadingInquiries ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : inquiries.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      문의 내역이 없습니다
                    </p>
                  ) : (
                    inquiries.map((inq) => (
                      <Card key={inq.id}>
                        <CardContent className="p-4">
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === inq.id ? null : inq.id)
                            }
                            className="flex w-full items-start justify-between text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_MAP[inq.status]?.color || "bg-gray-100 text-gray-800"}`}
                                >
                                  {STATUS_MAP[inq.status]?.label || inq.status}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(inq.created_at).toLocaleDateString("ko-KR")}
                                </span>
                              </div>
                              <p className="truncate text-sm font-medium">
                                {inq.title}
                              </p>
                            </div>
                            {expandedId === inq.id ? (
                              <ChevronUp className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                          </button>

                          {expandedId === inq.id && (
                            <div className="mt-3 space-y-3 border-t pt-3">
                              <div
                                className="prose prose-sm max-w-none text-sm"
                                dangerouslySetInnerHTML={{ __html: inq.content }}
                              />
                              {inq.admin_reply && (
                                <div className="rounded-lg bg-primary/5 p-3">
                                  <p className="mb-1 text-xs font-semibold text-primary">
                                    관리자 답변
                                  </p>
                                  <div
                                    className="prose prose-sm max-w-none text-sm"
                                    dangerouslySetInnerHTML={{
                                      __html: inq.admin_reply,
                                    }}
                                  />
                                  {inq.replied_at && (
                                    <p className="mt-2 text-[10px] text-muted-foreground">
                                      {new Date(inq.replied_at).toLocaleDateString("ko-KR")}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* 문의 작성 폼 */}
          <Card>
            <CardContent className="space-y-5 p-5 md:p-6">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">문의하기</h2>
              </div>

              {/* 이름 */}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  이름 <span className="text-destructive">*</span>
                </p>
                <Input
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* 이메일 */}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  이메일 <span className="text-destructive">*</span>
                </p>
                <Input
                  type="email"
                  placeholder="답변받을 이메일"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* 카테고리 */}
              <div>
                <p className="mb-1.5 text-sm font-medium">문의 유형</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        category === cat.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  제목 <span className="text-destructive">*</span>
                </p>
                <Input
                  placeholder="문의 제목을 입력하세요"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>

              {/* 본문 (리치 에디터) */}
              <div>
                <p className="mb-1.5 text-sm font-medium">
                  내용 <span className="text-destructive">*</span>
                </p>
                <RichEditor
                  ref={editorRef}
                  onImageUpload={handleImageUpload}
                  placeholder="문의 내용을 입력하세요. 스크린샷도 첨부 가능합니다."
                />
              </div>

              {/* 제출 */}
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full gap-1.5"
                size="lg"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                문의 접수하기
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <SupportContent />
    </Suspense>
  );
}
