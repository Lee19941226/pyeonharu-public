"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/medical/bookmark-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Building2,
  Navigation,
  Share2,
  Stethoscope,
  AlertCircle,
  Star,
  MessageSquare,
  Trash2,
  Edit3,
  UserRound,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { NaverMap } from "@/components/medical/naver-map";

// ─── restaurant_key 생성 (기존 로직 재활용) ───
function makeHospitalKey(name: string, address: string): string {
  const raw = `${name.trim()}::${address.trim()}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ─── 별점 컴포넌트 ───
function StarRating({
  rating,
  size = "sm",
  interactive = false,
  onChange,
}: {
  rating: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const displayRating = hoverRating || rating;
  const sizeClass = size === "md" ? "h-6 w-6" : "h-3.5 w-3.5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={
            interactive
              ? "cursor-pointer transition-transform hover:scale-110"
              : "cursor-default"
          }
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        >
          <Star
            className={`${sizeClass} ${
              star <= displayRating
                ? "fill-amber-400 text-amber-400"
                : "fill-none text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const REPORT_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "허위정보",
  "개인정보 노출",
  "기타",
];

const DEPARTMENTS = [
  "내과", "외과", "소아청소년과", "산부인과", "정형외과",
  "피부과", "이비인후과", "안과", "비뇨의학과", "신경과",
  "정신건강의학과", "재활의학과", "가정의학과", "치과", "한의원", "기타",
];

// ─── 리뷰 타입 ───
interface Review {
  id: string;
  rating: number;
  memo: string;
  isMine: boolean;
  createdAt: string;
}

interface DoctorReview {
  id: string;
  doctorName: string;
  department: string;
  diseaseName: string;
  rating: number;
  content: string;
  isMine: boolean;
  createdAt: string;
}

function HospitalDetailContent() {
  const searchParams = useSearchParams();

  const name = searchParams.get("name") || "";
  const address = searchParams.get("address") || "";
  const phone = searchParams.get("phone") || "";
  const department = searchParams.get("department") || "";
  const type = searchParams.get("type") || "병원";
  const lat = searchParams.get("lat") || "";
  const lng = searchParams.get("lng") || "";
  const hospitalId = searchParams.get("id") || name;

  // 리뷰 상태
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [myReview, setMyReview] = useState<{
    id: string;
    rating: number;
    memo: string;
  } | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newMemo, setNewMemo] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  // 의사 리뷰 상태
  const [doctorReviews, setDoctorReviews] = useState<DoctorReview[]>([]);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [drDoctorName, setDrDoctorName] = useState("");
  const [drDepartment, setDrDepartment] = useState("");
  const [drDiseaseName, setDrDiseaseName] = useState("");
  const [drRating, setDrRating] = useState(0);
  const [drContent, setDrContent] = useState("");
  const [drLoading, setDrLoading] = useState(false);
  // 신고
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTargetId, setReportTargetId] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  const hospitalKey = name && address ? makeHospitalKey(name, address) : "";

  // 의사 리뷰 조회
  const fetchDoctorReviews = useCallback(async () => {
    if (!name) return;
    try {
      const res = await fetch(
        `/api/doctor-reviews?hospital=${encodeURIComponent(name)}`,
      );
      const data = await res.json();
      if (data.reviews) setDoctorReviews(data.reviews);
    } catch {
      // 무시
    }
  }, [name]);

  useEffect(() => {
    fetchDoctorReviews();
  }, [fetchDoctorReviews]);

  // 의사 리뷰 작성
  const handleDoctorReviewSubmit = async () => {
    if (!drDoctorName.trim()) { toast.error("의사명을 입력해주세요."); return; }
    if (!drDepartment) { toast.error("진료과를 선택해주세요."); return; }
    if (!drDiseaseName.trim()) { toast.error("병명을 입력해주세요."); return; }
    if (drRating === 0) { toast.error("별점을 선택해주세요."); return; }

    setDrLoading(true);
    try {
      const res = await fetch("/api/doctor-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalName: name.trim(),
          hospitalAddress: address.trim(),
          doctorName: drDoctorName.trim(),
          department: drDepartment,
          diseaseName: drDiseaseName.trim(),
          rating: drRating,
          content: drContent.trim(),
        }),
      });
      if (res.status === 401) { toast.error("로그인이 필요합니다."); return; }
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "저장에 실패했습니다."); return; }

      toast.success("의사 리뷰가 등록되었습니다.");
      setShowDoctorForm(false);
      setDrDoctorName(""); setDrDepartment(""); setDrDiseaseName("");
      setDrRating(0); setDrContent("");
      fetchDoctorReviews();
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setDrLoading(false);
    }
  };

  // 의사 리뷰 삭제
  const handleDoctorReviewDelete = async (reviewId: string) => {
    if (!confirm("의사 리뷰를 삭제하시겠어요?")) return;
    try {
      const res = await fetch(`/api/doctor-reviews?id=${reviewId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("삭제되었습니다.");
        fetchDoctorReviews();
      }
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  // 신고
  const handleReport = async () => {
    if (!reportReason) { toast.error("신고 사유를 선택해주세요."); return; }
    setReportLoading(true);
    try {
      const res = await fetch(`/api/doctor-reviews/${reportTargetId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason }),
      });
      if (res.status === 401) toast.error("로그인이 필요합니다.");
      else if (res.status === 409) toast.error("이미 신고한 리뷰입니다.");
      else if (!res.ok) toast.error("신고 처리에 실패했습니다.");
      else toast.success("신고가 접수되었습니다.");
      setReportDialogOpen(false);
      setReportReason("");
    } catch {
      toast.error("신고 처리에 실패했습니다.");
    } finally {
      setReportLoading(false);
    }
  };

  // 리뷰 조회
  const fetchReviews = useCallback(async () => {
    if (!hospitalKey) return;
    try {
      const res = await fetch(`/api/restaurant/reviews?key=${hospitalKey}`);
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
      if (data.avg !== undefined) setAvgRating(data.avg);
      if (data.count !== undefined) setReviewCount(data.count);
      if (data.myReview) {
        setMyReview(data.myReview);
        setNewRating(data.myReview.rating);
        setNewMemo(data.myReview.memo);
      }
    } catch {
      // 조회 실패 무시
    }
  }, [hospitalKey]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // 리뷰 작성/수정
  const handleReviewSubmit = async () => {
    if (newRating === 0) {
      alert("별점을 선택해주세요");
      return;
    }
    setReviewLoading(true);
    try {
      const res = await fetch("/api/restaurant/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          rating: newRating,
          memo: newMemo.trim(),
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        alert("로그인이 필요합니다.");
        return;
      }
      if (data.success) {
        setShowReviewForm(false);
        fetchReviews();
      }
    } catch {
      alert("리뷰 저장에 실패했습니다.");
    } finally {
      setReviewLoading(false);
    }
  };

  // 리뷰 삭제
  const handleReviewDelete = async () => {
    if (!myReview || !confirm("리뷰를 삭제하시겠어요?")) return;
    try {
      const res = await fetch(`/api/restaurant/reviews?id=${myReview.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMyReview(null);
        setNewRating(0);
        setNewMemo("");
        fetchReviews();
      }
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  // 공유 기능
  const handleShare = async () => {
    const shareData = {
      title: `${name} - 편하루`,
      text: `${name} | ${address}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // 사용자 취소
      }
    } else {
      // fallback: 클립보드 복사
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("링크가 복사되었습니다!");
      } catch {
        alert("공유 기능을 사용할 수 없습니다.");
      }
    }
  };

  if (!name) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-4">
          <AlertCircle className="mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 text-xl font-bold">
            병원 정보를 찾을 수 없습니다
          </h1>
          <p className="mb-6 text-center text-muted-foreground">
            잘못된 접근이거나 정보가 없습니다.
          </p>
          <Button asChild>
            <Link href="/search">검색으로 돌아가기</Link>
          </Button>
        </main>
        <MobileNav />
      </div>
    );
  }

  const naverMapWebUrl = `https://map.naver.com/v5/search/${encodeURIComponent(name + " " + address)}`;
  const naverMapAppUrl =
    lat && lng
      ? `nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}`
      : naverMapWebUrl;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        {/* 뒤로가기 */}
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/search">
                <ArrowLeft className="mr-2 h-4 w-4" />
                검색으로 돌아가기
              </Link>
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="mx-auto max-w-2xl">
            {/* 병원명 + 배지 */}
            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  <Building2 className="mr-1 h-3 w-3" />
                  {type}
                </Badge>
                {department && <Badge variant="outline">{department}</Badge>}
              </div>
              <h1 className="text-2xl font-bold">{name}</h1>
              {/* 평균 별점 */}
              <div className="mt-2 flex items-center gap-2">
                <StarRating rating={Math.round(avgRating)} />
                <span className="text-sm font-medium text-amber-600">
                  {reviewCount > 0 ? avgRating : "0.0"}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({reviewCount}개 리뷰)
                </span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="mb-6 flex gap-2">
              <Button className="flex-1" asChild>
                <a href={`tel:${phone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  전화하기
                </a>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <a
                  href={naverMapAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="mr-2 h-4 w-4" />
                  길찾기
                </a>
              </Button>
              {/* ✅ 즐겨찾기 - BookmarkButton 컴포넌트 연결 */}
              <BookmarkButton
                type="hospital"
                id={hospitalId}
                name={name}
                address={address}
                phone={phone}
                category={department || type}
                lat={lat ? parseFloat(lat) : 0}
                lng={lng ? parseFloat(lng) : 0}
                size="md"
              />
              {/* ✅ 공유 - Web Share API / 클립보드 fallback */}
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            {/* 네이버 지도 API */}
            <Card className="mb-6">
              <CardContent className="p-0">
                <div className="relative h-56 w-full overflow-hidden rounded-t-lg">
                  {lat && lng ? (
                    <NaverMap
                      center={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
                      zoom={16}
                      markers={[{ id: "detail", lat: parseFloat(lat), lng: parseFloat(lng), label: name }]}
                      height="100%"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <p className="text-sm text-muted-foreground">위치 정보가 없습니다</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{address}</p>
                      <a
                        href={naverMapWebUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        네이버 지도에서 보기
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 병원 정보 */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">병원 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">전화번호</p>
                      <a
                        href={`tel:${phone}`}
                        className="font-medium text-primary"
                      >
                        {phone}
                      </a>
                    </div>
                  </div>
                )}
                {type && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        의료기관 종류
                      </p>
                      <p className="font-medium">{type}</p>
                    </div>
                  </div>
                )}
                {department && (
                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">진료과목</p>
                      <p className="font-medium">{department}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ✅ 리뷰 섹션 */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquare className="h-5 w-5" />
                    리뷰 ({reviewCount})
                  </CardTitle>
                  {!showReviewForm && (
                    <Button
                      size="sm"
                      variant={myReview ? "outline" : "default"}
                      onClick={() => {
                        if (myReview) {
                          setNewRating(myReview.rating);
                          setNewMemo(myReview.memo);
                        } else {
                          setNewRating(0);
                          setNewMemo("");
                        }
                        setShowReviewForm(true);
                      }}
                    >
                      <Edit3 className="mr-1 h-3.5 w-3.5" />
                      {myReview ? "내 리뷰 수정" : "리뷰 작성"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 리뷰 작성 폼 */}
                {showReviewForm && (
                  <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="mb-3 text-sm font-medium">
                      {myReview ? "리뷰 수정" : "리뷰 작성"}
                    </p>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        별점
                      </span>
                      <StarRating
                        rating={newRating}
                        size="md"
                        interactive
                        onChange={setNewRating}
                      />
                      {newRating > 0 && (
                        <span className="text-sm font-medium text-amber-600">
                          {newRating}점
                        </span>
                      )}
                    </div>
                    <textarea
                      value={newMemo}
                      onChange={(e) => setNewMemo(e.target.value.slice(0, 100))}
                      placeholder="방문 후기를 남겨주세요 (선택, 100자)"
                      className="mb-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      rows={3}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {newMemo.length}/100
                      </span>
                      <div className="flex gap-2">
                        {myReview && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleReviewDelete}
                            disabled={reviewLoading}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            삭제
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowReviewForm(false)}
                        >
                          취소
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleReviewSubmit}
                          disabled={reviewLoading || newRating === 0}
                        >
                          {reviewLoading
                            ? "저장 중..."
                            : myReview
                              ? "수정"
                              : "등록"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 리뷰 목록 */}
                {reviews.length === 0 && !showReviewForm ? (
                  <div className="py-8 text-center">
                    <Star className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      아직 리뷰가 없습니다
                    </p>
                    <p className="text-xs text-muted-foreground">
                      첫 번째 리뷰를 남겨보세요!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className={`rounded-lg border p-3 ${review.isMine ? "border-primary/30 bg-primary/5" : "border-border"}`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} />
                            {review.isMine && (
                              <Badge variant="secondary" className="text-xs">
                                내 리뷰
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </div>
                        {review.memo && (
                          <p className="text-sm text-foreground/80">
                            {review.memo}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 의사 리뷰 섹션 */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <UserRound className="h-5 w-5" />
                    의사 리뷰 ({doctorReviews.length})
                  </CardTitle>
                  {!showDoctorForm && (
                    <Button
                      size="sm"
                      onClick={() => setShowDoctorForm(true)}
                    >
                      <Edit3 className="mr-1 h-3.5 w-3.5" />
                      의사 리뷰 작성
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* 의사 리뷰 작성 폼 */}
                {showDoctorForm && (
                  <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="mb-3 text-sm font-medium">
                      어떤 의사에게 진료받았나요?
                    </p>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">의사명</Label>
                        <Input
                          placeholder="홍길동"
                          value={drDoctorName}
                          onChange={(e) => setDrDoctorName(e.target.value)}
                          maxLength={50}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">진료과</Label>
                        <Select value={drDepartment} onValueChange={setDrDepartment}>
                          <SelectTrigger>
                            <SelectValue placeholder="진료과 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEPARTMENTS.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">병명 (의사가 알려준 진단명)</Label>
                        <Input
                          placeholder="예: 소아 요로감염, 위염"
                          value={drDiseaseName}
                          onChange={(e) => setDrDiseaseName(e.target.value)}
                          maxLength={100}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">평점</Label>
                        <StarRating
                          rating={drRating}
                          size="md"
                          interactive
                          onChange={setDrRating}
                        />
                        {drRating > 0 && (
                          <span className="text-sm font-medium text-amber-600">
                            {drRating}점
                          </span>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">한줄 후기 (선택)</Label>
                        <textarea
                          value={drContent}
                          onChange={(e) => setDrContent(e.target.value.slice(0, 500))}
                          placeholder="진료 경험을 공유해주세요"
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                          rows={3}
                        />
                        <span className="text-xs text-muted-foreground">
                          {drContent.length}/500
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowDoctorForm(false)}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDoctorReviewSubmit}
                        disabled={drLoading}
                      >
                        {drLoading ? "저장 중..." : "등록"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 의사 리뷰 목록 */}
                {doctorReviews.length === 0 && !showDoctorForm ? (
                  <div className="py-8 text-center">
                    <UserRound className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      아직 의사 리뷰가 없습니다
                    </p>
                    <p className="text-xs text-muted-foreground">
                      진료받은 의사 선생님에 대한 후기를 남겨보세요!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {doctorReviews.map((dr) => (
                      <div
                        key={dr.id}
                        className={`rounded-lg border p-3 ${dr.isMine ? "border-primary/30 bg-primary/5" : "border-border"}`}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {dr.doctorName}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {dr.department}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {dr.diseaseName}
                            </Badge>
                            {dr.isMine && (
                              <Badge variant="secondary" className="text-xs border-primary/30">
                                내 리뷰
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StarRating rating={dr.rating} />
                            {dr.isMine ? (
                              <button
                                className="text-destructive hover:text-destructive/80"
                                onClick={() => handleDoctorReviewDelete(dr.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : (
                              <button
                                className="text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  setReportTargetId(dr.id);
                                  setReportDialogOpen(true);
                                }}
                              >
                                <Flag className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {dr.content && (
                          <p className="text-sm text-foreground/80">{dr.content}</p>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(dr.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground">
              정보가 정확하지 않을 수 있습니다. 방문 전 전화로 확인해주세요.
            </p>
          </div>
        </div>
      </main>
      <MobileNav />

      {/* 신고 다이얼로그 */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>리뷰 신고</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="신고 사유 선택" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleReport}
              disabled={reportLoading || !reportReason}
            >
              <Flag className="mr-2 h-4 w-4" />
              신고하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function HospitalDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>로딩 중...</p>
        </div>
      }
    >
      <HospitalDetailContent />
    </Suspense>
  );
}
