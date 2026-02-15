import { Metadata } from "next";

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
    if (!id.startsWith("ai-")) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/food/result?code=${id}`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          productName = data.result.foodName;
          isSafe = data.result.isSafe;
          allergens = data.result.detectedAllergens
            ?.map((a: any) => a.name)
            .join(", ");
          manufacturer = data.result.manufacturer;
        }
      }
    }
  } catch (error) {
    console.error("메타데이터 생성 실패:", error);
  }

  const ogImageUrl = new URL(
    `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/og`,
  );
  ogImageUrl.searchParams.set("name", productName);
  ogImageUrl.searchParams.set("safe", isSafe.toString());
  ogImageUrl.searchParams.set("allergens", allergens || "");
  ogImageUrl.searchParams.set("manufacturer", manufacturer || "");

  return {
    title: `${productName} | 편하루`,
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
