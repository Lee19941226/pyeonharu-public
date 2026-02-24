# DietTab.tsx 패치 가이드
# 아래 변경사항을 기존 DietTab.tsx에 수동으로 적용해주세요.

## 1. import 추가 (lucide-react에 Share2 추가)
# 기존:
#   Download,
# } from "lucide-react";
# 변경:
#   Download,
#   Share2,
# } from "lucide-react";

## 2. 카카오 SDK 초기화 함수 추가 (BarChart 함수 아래, interface 선언 위에)
# 아래 코드를 추가:

```
// ─── 카카오 SDK 초기화 ───
function initKakao() {
  if (typeof window !== "undefined" && window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_KEY);
  }
}
```

## 3. DietTab 컴포넌트 내부 state 추가
# editImageInputRef 선언 아래에 추가:
```
  const [showShareMenu, setShowShareMenu] = useState(false);
```

## 4. useEffect 추가 (카카오 초기화 + 이벤트 리스너)
# 기존 useEffect(() => { supabase.auth.getUser()... 위에 추가:
```
  // ✅ 카카오 SDK 초기화
  useEffect(() => { initKakao() }, []);
```

# loadEntries useEffect 아래에 추가:
```
  // ✅ 외부에서 식단 추가 시 데이터 새로고침 (mobile-nav에서 diet-entry-added 이벤트)
  useEffect(() => {
    const handleDietEntryAdded = () => {
      if (user) { loadEntries(); loadDashboard() }
    };
    window.addEventListener("diet-entry-added", handleDietEntryAdded);
    return () => window.removeEventListener("diet-entry-added", handleDietEntryAdded);
  }, [user, loadEntries]);
```

## 5. 카카오 공유 함수 2개 추가 (moveDate 함수 아래에)
```
  // ─── 카카오 공유: 오늘 먹은 음식 ───
  const shareToday = () => {
    if (!window.Kakao) { toast.error("카카오톡 공유를 사용할 수 없습니다"); return }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다", { description: "배포 후 테스트해주세요", duration: 5000 }); return
    }
    const shareUrl = `${window.location.origin}/diet`;
    const foodList = entries.length > 0
      ? entries.map(e => `${e.emoji} ${e.food_name} (${e.estimated_cal}kcal)`).slice(0, 5).join("\n")
      : "아직 기록이 없어요";
    const moreText = entries.length > 5 ? `\n...외 ${entries.length - 5}개 더` : "";
    const statusText = isOver
      ? `⚠️ 기초대사량 대비 ${overAmount.toLocaleString()}kcal 초과!`
      : bmr > 0 ? `✅ 기초대사량 대비 ${(bmr - totalCal).toLocaleString()}kcal 남음` : `총 ${totalCal.toLocaleString()}kcal 섭취`;
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: {
          title: `🍽️ ${isToday ? "오늘" : new Date(date + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 먹은 것들`,
          description: `${foodList}${moreText}\n\n${statusText}`,
          imageUrl: `${window.location.origin}/pyeonharu-icon.svg`,
          imageWidth: 200, imageHeight: 200,
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [{ title: "편하루에서 식단 관리하기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
      setShowShareMenu(false);
    } catch { toast.error("공유에 실패했습니다") }
  };

  // ─── 카카오 공유: 식단 리포트 ───
  const shareReport = () => {
    if (!window.Kakao) { toast.error("카카오톡 공유를 사용할 수 없습니다"); return }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다", { description: "배포 후 테스트해주세요", duration: 5000 }); return
    }
    const shareUrl = `${window.location.origin}/diet`;
    const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    let title = `📊 ${dateLabel} 식단 리포트`;
    let description = `총 ${totalCal.toLocaleString()}kcal 섭취 · ${entries.length}끼`;
    if (bmr > 0) {
      description += isOver
        ? `\n⚠️ 기초대사량 대비 ${overAmount.toLocaleString()}kcal 초과`
        : `\n✅ 기초대사량 대비 ${(bmr - totalCal).toLocaleString()}kcal 남음`;
    }
    if (dashData?.summary) {
      const rangeLabel = getRangeLabel();
      title = `📊 식단 리포트 (${rangeLabel})`;
      description = `일 평균 ${dashData.summary.avgCal.toLocaleString()}kcal\n${dashData.summary.daysWithData}일 기록 / ${dashData.summary.totalDays}일`;
      if (bmr > 0 && dashData.summary.overDays > 0) description += `\n⚠️ ${dashData.summary.overDays}일 칼로리 초과`;
      if (dashData.summary.topFoods.length > 0) description += `\n🍴 자주 먹은: ${dashData.summary.topFoods.slice(0, 3).map(f => f.name).join(", ")}`;
    }
    try {
      window.Kakao.Share.sendDefault({
        objectType: "feed",
        content: { title, description, imageUrl: `${window.location.origin}/pyeonharu-icon.svg`, imageWidth: 200, imageHeight: 200, link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
        buttons: [{ title: "편하루에서 식단 관리하기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
      });
      setShowShareMenu(false);
    } catch { toast.error("공유에 실패했습니다") }
  };
```

## 6. 타임라인 헤더 영역 수정 (📋 오늘/이 날 먹은 것들 부분)
# 기존:
```
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold flex items-center gap-1">📋 {isToday ? "오늘" : "이 날"} 먹은 것들</h2>
              <span className="text-[9px] text-muted-foreground">00시 리셋</span>
            </div>
```

# 변경:
```
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold flex items-center gap-1">📋 {isToday ? "오늘" : "이 날"} 먹은 것들</h2>
              <div className="flex items-center gap-2">
                {entries.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded-md hover:bg-muted"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>공유</span>
                    </button>
                    {showShareMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                        <div className="absolute right-0 top-6 z-50 w-44 rounded-lg border bg-background shadow-lg p-1 space-y-0.5">
                          <button onClick={shareToday} className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] hover:bg-muted transition-colors text-left">
                            <span>🍽️</span><div><p className="font-medium">먹은 음식 공유</p><p className="text-[9px] text-muted-foreground">{isToday ? "오늘" : "이 날"} 먹은 것들</p></div>
                          </button>
                          <button onClick={shareReport} className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] hover:bg-muted transition-colors text-left">
                            <span>📊</span><div><p className="font-medium">식단 리포트 공유</p><p className="text-[9px] text-muted-foreground">칼로리 요약 · 통계</p></div>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <span className="text-[9px] text-muted-foreground">00시 리셋</span>
              </div>
            </div>
```
