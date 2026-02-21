// ============================================
// FoodTab.tsx 수정 가이드
// handleImageUpload 함수만 아래로 교체하세요
// ============================================

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    setIsProcessing(true);
    toast.info("이미지 분석 중...");

    try {
      // 파일을 base64로 변환
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;

        try {
          // 사용자 알레르기 가져오기
          const supabase = createClient();
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          let userAllergens: string[] = [];

          if (currentUser) {
            const { data } = await supabase
              .from("user_allergies")
              .select("allergen_name")
              .eq("user_id", currentUser.id);
            if (data) {
              userAllergens = data.map((item) => item.allergen_name);
            }
          }

          // base64만 추출 (data:image/jpeg;base64, 제거)
          const base64Data = imageData.includes(",")
            ? imageData.split(",")[1]
            : imageData;

          const response = await fetch("/api/food/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64Data,
              userAllergens: userAllergens,
            }),
          });

          const data = await response.json();

          if (data.success && data.foodCode) {
            sessionStorage.setItem(
              `ai_result_${data.foodCode}`,
              JSON.stringify({
                foodCode: data.foodCode,
                productName: data.productName,
                manufacturer: data.manufacturer,
                weight: data.weight,
                allergens: data.allergens,
                hasUserAllergen: data.hasUserAllergen,
                matchedUserAllergens: data.matchedUserAllergens || [],
                ingredients: data.ingredients || [],
                rawMaterials: data.rawMaterials || "",
                nutritionInfo: data.nutritionInfo || null,
                dataSource: data.dataSource || "ai",
              }),
            );
            toast.success("분석 완료!");
            router.push(`/food/result/${data.foodCode}`);
          } else if (data.success && data.analysisId) {
            toast.success("분석 완료!");
            router.push(`/food/result/${data.analysisId}`);
          } else {
            toast.error(data.error || "분석에 실패했습니다");
          }
        } catch (error) {
          console.error("이미지 분석 오류:", error);
          toast.error("이미지 분석 중 오류가 발생했습니다");
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("이미지 분석 오류:", error);
      toast.error("이미지 분석 중 오류가 발생했습니다");
      setIsProcessing(false);
    }
  };
