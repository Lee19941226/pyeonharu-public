import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // URL 파라미터에서 정보 추출
    const productName = searchParams.get("name") || "제품명 없음";
    const isSafe = searchParams.get("safe") === "true";
    const allergens = searchParams.get("allergens") || "";
    const manufacturer = searchParams.get("manufacturer") || "";

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isSafe ? "#f0fdf4" : "#fef2f2",
          backgroundImage: isSafe
            ? "radial-gradient(circle at 25px 25px, #22c55e 2%, transparent 0%), radial-gradient(circle at 75px 75px, #22c55e 2%, transparent 0%)"
            : "radial-gradient(circle at 25px 25px, #ef4444 2%, transparent 0%), radial-gradient(circle at 75px 75px, #ef4444 2%, transparent 0%)",
          backgroundSize: "100px 100px",
        }}
      >
        {/* 로고/브랜드 */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 12,
              backgroundColor: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              color: "white",
            }}
          >
            편
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#1f2937",
            }}
          >
            편하루
          </div>
        </div>

        {/* 메인 카드 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 60,
            backgroundColor: "white",
            borderRadius: 24,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            maxWidth: 800,
            margin: "0 60px",
          }}
        >
          {/* 상태 아이콘 */}
          <div
            style={{
              fontSize: 120,
              marginBottom: 20,
            }}
          >
            {isSafe ? "🟢" : "🔴"}
          </div>

          {/* 제품명 */}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#1f2937",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {productName}
          </div>

          {/* 제조사 */}
          {manufacturer && (
            <div
              style={{
                fontSize: 28,
                color: "#6b7280",
                marginBottom: 32,
              }}
            >
              {manufacturer}
            </div>
          )}

          {/* 상태 텍스트 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "20px 40px",
              backgroundColor: isSafe ? "#dcfce7" : "#fee2e2",
              borderRadius: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: isSafe ? "#15803d" : "#dc2626",
              }}
            >
              {isSafe ? "안전해요!" : "위험해요!"}
            </div>
          </div>

          {/* 알레르기 정보 */}
          {!isSafe && allergens && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  color: "#991b1b",
                  fontWeight: 600,
                }}
              >
                ⚠️ 알레르기 성분
              </div>
              <div
                style={{
                  fontSize: 32,
                  color: "#dc2626",
                  fontWeight: 700,
                }}
              >
                {allergens}
              </div>
            </div>
          )}

          {isSafe && (
            <div
              style={{
                fontSize: 28,
                color: "#15803d",
              }}
            >
              알레르기 성분이 없습니다
            </div>
          )}
        </div>

        {/* 하단 CTA */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            fontSize: 24,
            color: "#6b7280",
          }}
        >
          내 알레르기도 확인하러 가기 →
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
