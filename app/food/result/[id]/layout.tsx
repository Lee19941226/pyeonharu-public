import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let productName = "제품";
  let isSafe = true;
  let allergens = "";
  let manufacturer = "";

  try {
    // ✅ AI 결과는 제외 (sessionStorage는 서버에서 접근 불가)
    if (!id.startsWith("ai-")) {
      // ✅ Supabase 직접 조회 (fetch 대신)
      const supabase = await createClient();

      // 1. DB 캐시 먼저 확인
      const { data: cachedData } = await supabase
        .from("food_search_cache")
        .select("*")
        .eq("food_code", id)
        .maybeSingle();

      if (cachedData) {
        productName = cachedData.food_name;
        manufacturer = cachedData.manufacturer || "";
        allergens = (cachedData.allergens || []).join(", ");

        // 사용자 알레르기와 비교
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: userAllergyData } = await supabase
            .from("user_allergies")
            .select("allergen_name")
            .eq("user_id", user.id);

          if (userAllergyData) {
            const userAllergens = userAllergyData.map((ua) => ua.allergen_name);
            const hasAllergen = (cachedData.allergens || []).some((a: string) =>
              userAllergens.some((ua) => a.includes(ua) || ua.includes(a)),
            );
            isSafe = !hasAllergen;
          }
        } else {
          // 비로그인 사용자는 알레르기만 표시
          isSafe = !cachedData.allergens || cachedData.allergens.length === 0;
        }
      } else {
        // 2. DB 캐시에 없으면 Open API 호출
        const serviceKey = process.env.FOOD_API_KEY || "";

        // ✅ API 키가 없으면 스킵
        if (!serviceKey) {
          console.warn("⚠️ FOOD_API_KEY 없음, 기본 메타데이터 사용");
        } else {
          const baseUrl = "https://apis.data.go.kr/1471000/FoodQrInfoService01";

          try {
            // 품목제조정보 API
            const productUrl = new URL(`${baseUrl}/getFoodQrProdMnfInfo01`);
            productUrl.searchParams.append("serviceKey", serviceKey);
            productUrl.searchParams.append("pageNo", "1");
            productUrl.searchParams.append("numOfRows", "1");
            productUrl.searchParams.append("type", "json");
            productUrl.searchParams.append("brcd_no", id);

            const productRes = await fetch(productUrl.toString(), {
              next: { revalidate: 3600 }, // ✅ 1시간 캐싱
            });

            // ✅ 응답 상태 확인
            if (!productRes.ok) {
              console.warn(`⚠️ Open API 응답 실패: ${productRes.status}`);
            } else {
              const contentType = productRes.headers.get("content-type");

              // ✅ JSON 응답인지 확인
              if (contentType?.includes("application/json")) {
                const productData = await productRes.json();
                const productInfo = productData.body?.items?.[0];

                if (productInfo) {
                  productName = productInfo.PRDCT_NM || "제품";
                  manufacturer = productInfo.MNFCTUR || "";
                }

                // 알레르기 정보 API
                const allergyUrl = new URL(
                  `${baseUrl}/getFoodQrAllrgyInfo01`,
                );
                allergyUrl.searchParams.append("serviceKey", serviceKey);
                allergyUrl.searchParams.append("pageNo", "1");
                allergyUrl.searchParams.append("numOfRows", "100");
                allergyUrl.searchParams.append("type", "json");
                allergyUrl.searchParams.append("brcd_no", id);

                const allergyRes = await fetch(allergyUrl.toString(), {
                  next: { revalidate: 3600 }, // ✅ 1시간 캐싱
                });

                if (allergyRes.ok) {
                  const allergyContentType =
                    allergyRes.headers.get("content-type");

                  if (allergyContentType?.includes("application/json")) {
                    const allergyData = await allergyRes.json();
                    const allergyItems = allergyData.body?.items || [];

                    if (allergyItems.length > 0) {
                      const allergyNames = [
                        ...new Set(
                          allergyItems
                            .map((item: any) => item.ALG_CSG_MTR_NM)
                            .filter(Boolean),
                        ),
                      ];
                      allergens = allergyNames.join(", ");
                      isSafe = allergyNames.length === 0;
                    }
                  }
                }
              } else {
                console.warn(`⚠️ 응답이 JSON이 아님: ${contentType}`);
                const text = await productRes.text();
                console.warn(`응답 내용: ${text.substring(0, 200)}`);
              }
            }
          } catch (apiError) {
            console.error("⚠️ Open API 조회 실패:", apiError);
            // ✅ 에러 발생해도 계속 진행 (기본값 사용)
          }
        }
      }
    }
  } catch (error) {
    console.error("⚠️ 메타데이터 생성 실패:", error);
    // ✅ 에러 발생해도 기본 메타데이터 반환
  }

  // ✅ 동적 OG 이미지 URL 생성
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const ogImageUrl = new URL(`${baseUrl}/api/og`);
  ogImageUrl.searchParams.set("name", productName);
  ogImageUrl.searchParams.set("safe", isSafe.toString());
  ogImageUrl.searchParams.set("allergens", allergens || "");
  ogImageUrl.searchParams.set("manufacturer", manufacturer || "");

  return {
    title: {
      absolute: `편하루 - ${productName}`,
    },
    description: isSafe
      ? `${productName} - 안전해요! 알레르기 성분이 없습니다`
      : `${productName} - 위험해요! ${allergens}`,
    openGraph: {
      title: `${productName}`,
      description: isSafe
        ? `🟢 안전해요! 알레르기 성분이 없습니다`
        : `🔴 위험해요! ${allergens}`,
      images: [
        {
          url: ogImageUrl.toString(),
          width: 1200,
          height: 630,
          alt: productName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${productName} | 편하루`,
      description: isSafe
        ? `안전해요! 알레르기 성분이 없습니다`
        : `위험해요! ${allergens}`,
      images: [ogImageUrl.toString()],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
