# DietTab.tsx 패치 가이드
# 기존 DietTab.tsx에 아래 6가지 변경을 순서대로 적용하세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 1. import에 Share2, Plus 추가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기존:
  Download,
} from "lucide-react";

변경:
  Download,
  Share2,
  Plus,
} from "lucide-react";


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 2. 카카오 SDK 초기화 함수 추가 (BarChart 함수 뒤에)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── 카카오 SDK 초기화 ───
function initKakao() {
  if (typeof window !== "undefined" && window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_KEY);
  }
}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 3. state 추가 (editImageInputRef 아래에)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const [showRecordSheet, setShowRecordSheet] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 4. useEffect 추가
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기존 useEffect들 사이에 추가:

  // ✅ 카카오 SDK 초기화
  useEffect(() => { initKakao() }, []);

  // ✅ 외부에서 식단 추가 시 데이터 새로고침
  useEffect(() => {
    const handler = () => { if (user) { loadEntries(); loadDashboard() } };
    window.addEventListener("diet-entry-added", handler);
    return () => window.removeEventListener("diet-entry-added", handler);
  }, [user, loadEntries]);


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 5. 카카오 공유 함수 2개 추가 (moveDate 아래에)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const shareToday = () => {
    if (!window.Kakao) { toast.error("카카오톡 공유를 사용할 수 없습니다"); return }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") { toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다", { description: "배포 후 테스트해주세요", duration: 5000 }); return }
    const shareUrl = `${window.location.origin}/diet`;
    const foodList = entries.length > 0 ? entries.map(e => `${e.emoji} ${e.food_name} (${e.estimated_cal}kcal)`).slice(0, 5).join("\n") : "아직 기록이 없어요";
    const moreText = entries.length > 5 ? `\n...외 ${entries.length - 5}개 더` : "";
    const statusText = isOver ? `⚠️ 기초대사량 대비 ${overAmount.toLocaleString()}kcal 초과!` : bmr > 0 ? `✅ 기초대사량 대비 ${(bmr - totalCal).toLocaleString()}kcal 남음` : `총 ${totalCal.toLocaleString()}kcal 섭취`;
    try {
      window.Kakao.Share.sendDefault({ objectType: "feed", content: { title: `🍽️ ${isToday ? "오늘" : new Date(date + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} 먹은 것들`, description: `${foodList}${moreText}\n\n${statusText}`, imageUrl: `${window.location.origin}/pyeonharu-icon.svg`, imageWidth: 200, imageHeight: 200, link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }, buttons: [{ title: "편하루에서 식단 관리하기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }] });
      setShowShareMenu(false);
    } catch { toast.error("공유에 실패했습니다") }
  };

  const shareReport = () => {
    if (!window.Kakao) { toast.error("카카오톡 공유를 사용할 수 없습니다"); return }
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") { toast.error("카카오톡 공유는 실제 도메인에서만 작동합니다", { description: "배포 후 테스트해주세요", duration: 5000 }); return }
    const shareUrl = `${window.location.origin}/diet`;
    const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    let title = `📊 ${dateLabel} 식단 리포트`;
    let description = `총 ${totalCal.toLocaleString()}kcal 섭취 · ${entries.length}끼`;
    if (bmr > 0) { description += isOver ? `\n⚠️ 기초대사량 대비 ${overAmount.toLocaleString()}kcal 초과` : `\n✅ 기초대사량 대비 ${(bmr - totalCal).toLocaleString()}kcal 남음`; }
    if (dashData?.summary) {
      const rangeLabel = getRangeLabel();
      title = `📊 식단 리포트 (${rangeLabel})`;
      description = `일 평균 ${dashData.summary.avgCal.toLocaleString()}kcal\n${dashData.summary.daysWithData}일 기록 / ${dashData.summary.totalDays}일`;
      if (bmr > 0 && dashData.summary.overDays > 0) description += `\n⚠️ ${dashData.summary.overDays}일 칼로리 초과`;
      if (dashData.summary.topFoods.length > 0) description += `\n🍴 자주 먹은: ${dashData.summary.topFoods.slice(0, 3).map(f => f.name).join(", ")}`;
    }
    try {
      window.Kakao.Share.sendDefault({ objectType: "feed", content: { title, description, imageUrl: `${window.location.origin}/pyeonharu-icon.svg`, imageWidth: 200, imageHeight: 200, link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }, buttons: [{ title: "편하루에서 식단 관리하기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }] });
      setShowShareMenu(false);
    } catch { toast.error("공유에 실패했습니다") }
  };


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 6. 버튼 영역 교체 (촬영/앨범/직접입력 → 기록하기 + 공유)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

기존 (3개 버튼):
            {isToday && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/5" onClick={() => cameraInputRef.current?.click()} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}{isAnalyzing ? "분석중" : "촬영"}
                </Button>
                <Button variant="outline" className="flex-1 gap-1.5 text-xs h-9 border-primary/30 text-primary hover:bg-primary/5" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
                  <ImageIcon className="h-3.5 w-3.5" />앨범
                </Button>
                <Button className="flex-1 gap-1.5 text-xs h-9" onClick={() => setShowManualInput(true)}><PenLine className="h-3.5 w-3.5" />직접 입력</Button>
                <input ref={cameraInputRef} ... />
                <input ref={fileInputRef} ... />
              </div>
            )}

변경 (기록하기 + 공유):
            {isToday && (
              <div className="flex gap-2">
                <Button className="flex-1 gap-1.5 text-xs h-9" onClick={() => setShowRecordSheet(true)} disabled={isAnalyzing}>
                  {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {isAnalyzing ? "분석 중..." : "기록하기"}
                </Button>
                <div className="relative">
                  <Button variant="outline" size="icon" className="h-9 w-9 border-primary/30 text-primary hover:bg-primary/5" onClick={() => setShowShareMenu(!showShareMenu)} disabled={entries.length === 0}>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                  {showShareMenu && entries.length > 0 && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
                      <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border bg-background shadow-lg p-1.5 space-y-0.5">
                        <button onClick={shareToday} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] hover:bg-muted transition-colors text-left">
                          <span className="text-base">🍽️</span><div><p className="font-medium">먹은 음식 공유</p><p className="text-[9px] text-muted-foreground">카카오톡으로 공유</p></div>
                        </button>
                        <button onClick={shareReport} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] hover:bg-muted transition-colors text-left">
                          <span className="text-base">📊</span><div><p className="font-medium">식단 리포트 공유</p><p className="text-[9px] text-muted-foreground">칼로리 요약 · 통계</p></div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)handlePhotoAnalyze(f);e.target.value=""}} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)handlePhotoAnalyze(f);e.target.value=""}} />
              </div>
            )}


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## 7. 기록하기 바텀시트 추가 (컴포넌트 마지막 return 닫기 전에)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

초과 경고 모달 앞에 추가:

      {/* ✅ 기록하기 바텀시트 */}
      {showRecordSheet && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50" onClick={() => setShowRecordSheet(false)}>
          <div className="w-full max-w-md animate-in slide-in-from-bottom duration-200 rounded-t-2xl bg-background p-5 space-y-3" style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/20" />
            <div className="text-center">
              <h3 className="text-base font-bold">🍽️ 식단 기록하기</h3>
              <p className="text-xs text-muted-foreground mt-0.5">음식을 기록할 방법을 선택하세요</p>
            </div>
            <div className="space-y-2">
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10"><Camera className="h-5 w-5 text-primary" /></div>
                <div className="text-left"><p className="text-sm font-semibold">카메라로 촬영</p><p className="text-xs text-muted-foreground">AI가 음식을 분석하고 칼로리를 추정해요</p></div>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setShowRecordSheet(false); handlePhotoAnalyze(f) }; e.target.value = "" }} />
              </label>
              <label className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-500/10"><ImageIcon className="h-5 w-5 text-orange-500" /></div>
                <div className="text-left"><p className="text-sm font-semibold">앨범에서 선택</p><p className="text-xs text-muted-foreground">저장된 음식 사진으로 분석</p></div>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setShowRecordSheet(false); handlePhotoAnalyze(f) }; e.target.value = "" }} />
              </label>
              <button onClick={() => { setShowRecordSheet(false); setShowManualInput(true) }} className="flex w-full items-center gap-4 rounded-xl border p-4 hover:bg-muted/50 active:bg-muted transition-colors">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/10"><PenLine className="h-5 w-5 text-blue-500" /></div>
                <div className="text-left"><p className="text-sm font-semibold">직접 입력</p><p className="text-xs text-muted-foreground">음식 이름과 칼로리를 직접 입력해요</p></div>
              </button>
            </div>
            <button onClick={() => setShowRecordSheet(false)} className="flex w-full items-center justify-center rounded-xl border p-3 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">취소</button>
          </div>
        </div>
      )}
