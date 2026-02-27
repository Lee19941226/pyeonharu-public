import type { Metadata } from "next";
import EmergencyGuideClient from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  return {
    title: `${decodedId} 알레르기 대응 가이드`,
    description: `${decodedId} 알레르기 반응 시 즉시 행동 요령, 응급 증상 판단 기준, 대체 식품 정보를 확인하세요.`,
    openGraph: {
      title: `${decodedId} 알레르기 대응 가이드 | 편하루`,
      description: `${decodedId} 알레르기 긴급 대처법과 안전 식품 정보`,
      type: "article",
    },
  };
}

export default function EmergencyGuidePage() {
  return <EmergencyGuideClient />;
}
