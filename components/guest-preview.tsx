"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  MessageSquare,
  Eye,
  Heart,
  X,
  LogIn,
  ChevronRight,
} from "lucide-react";

interface MenuItem {
  name: string;
  allergenNumbers: string[];
  allergenNames: string[];
  status: string;
}

interface Meal {
  mealType: string;
  mealTypeName: string;
  menu: MenuItem[];
  calInfo: string;
}

interface Post {
  id: string;
  title: string;
  schoolName: string;
  author: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
}

const BANNER_KEY = "pyeonharu_guest_banner_dismissed";

export function GuestPreview() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [bannerDismissed, setBannerDismissed] = useState(true);

  useEffect(() => {
    setBannerDismissed(localStorage.getItem(BANNER_KEY) === "1");

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    fetch(
      `/api/school/meals?schoolCode=PYEONHARU&officeCode=PYEONHARU&date=${today}`,
    )
      .then((r) => r.json())
      .then((d) => {
        setMeals(d.meals || []);
        setMealsLoaded(true);
      })
      .catch(() => setMealsLoaded(true));

    fetch("/api/community?limit=5")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {});
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(BANNER_KEY, "1");
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "방금";
    if (min < 60) return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}시간 전`;
    return `${Math.floor(hr / 24)}일 전`;
  };

  return (
    <div className="container mx-auto px-4 pt-4">
      <div className="mx-auto max-w-2xl space-y-3">
        {/* 비로그인 배너 */}
        {!bannerDismissed && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
            <LogIn className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="flex-1 text-amber-800 dark:text-amber-200">
              로그인하면 내 알레르기에 맞는 맞춤 정보를 받을 수 있어요
            </p>
            <button
              onClick={dismissBanner}
              className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 오늘의 급식 */}
        {mealsLoaded && (
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <UtensilsCrossed className="h-4 w-4 text-amber-600" />
                편하루 고등학교 오늘의 급식
              </h3>
            </div>
            {meals.length > 0 ? (
              <div className="space-y-2">
                {meals.map((meal) => (
                  <div key={meal.mealType}>
                    <span className="text-xs font-medium text-muted-foreground">
                      {meal.mealTypeName}
                    </span>
                    <p className="text-sm">
                      {meal.menu.map((m) => m.name).join(", ")}
                    </p>
                    {meal.calInfo && (
                      <span className="text-[11px] text-muted-foreground">
                        {meal.calInfo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                오늘은 급식 정보가 없습니다.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              로그인하면 내 학교 급식과 알레르기 안전 정보를 확인할 수 있어요
            </p>
          </div>
        )}

        {/* 최신 커뮤니티 */}
        {posts.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                커뮤니티 최신글
              </h3>
              <button
                onClick={() => router.push("/community")}
                className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                더보기
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="space-y-1">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => router.push(`/community/${post.id}`)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors"
                >
                  <span className="flex-1 truncate">{post.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                    {post.comment_count > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="h-3 w-3" />
                        {post.comment_count}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />
                      {post.view_count}
                    </span>
                    {post.like_count > 0 && (
                      <span className="flex items-center gap-0.5 text-red-500">
                        <Heart className="h-3 w-3 fill-current" />
                        {post.like_count}
                      </span>
                    )}
                    <span>{timeAgo(post.created_at)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
