import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productName = searchParams.get("name") || "제품명 없음";
    const isSafe = searchParams.get("safe") === "true";
    const allergens = searchParams.get("allergens") || "";
    const manufacturer = searchParams.get("manufacturer") || "";
    const dataSource = searchParams.get("source") || ""; // ✅ AI/QR 구분용 추가

    const bgColor = isSafe ? "#f0fdf4" : "#fef2f2";
    const accentColor = isSafe ? "#16a34a" : "#dc2626";
    const statusText = isSafe ? "✅ 안전해요" : "⚠️ 주의하세요";
    const statusBg = isSafe ? "#dcfce7" : "#fee2e2";

    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: bgColor,
          fontFamily: "sans-serif",
        }}
      >
        {/* 상단 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 36px 16px",
            backgroundColor: accentColor,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 900,
                color: accentColor,
              }}
            >
              편
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: "white" }}>
              편하루
            </span>
          </div>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>
            알레르기 안심 식품 정보
          </span>
        </div>

        {/* 메인 컨텐츠 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "24px 36px",
            gap: 28,
          }}
        >
          {/* 상태 뱃지 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: statusBg,
              border: `3px solid ${accentColor}`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 48 }}>{isSafe ? "✅" : "⚠️"}</span>
          </div>

          {/* 제품 정보 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            {/* 상태 텍스트 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: statusBg,
                borderRadius: 8,
                padding: "4px 14px",
                width: "fit-content",
              }}
            >
              <span
                style={{ fontSize: 18, fontWeight: 700, color: accentColor }}
              >
                {statusText}
              </span>
            </div>

            {/* 제품명 */}
            <span
              style={{
                fontSize: productName.length > 14 ? 26 : 32,
                fontWeight: 800,
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              {productName.length > 20
                ? productName.slice(0, 20) + "…"
                : productName}
            </span>

            {/* 제조사 */}
            {manufacturer && (
              <span style={{ fontSize: 18, color: "#6b7280" }}>
                {manufacturer}
              </span>
            )}

            {/* 알레르기 정보 */}
            {!isSafe && allergens && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allergens
                  .split(",")
                  .slice(0, 3)
                  .map((a, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 15,
                        backgroundColor: "#fecaca",
                        color: "#991b1b",
                        borderRadius: 6,
                        padding: "2px 10px",
                        fontWeight: 600,
                      }}
                    >
                      {a.trim()}
                    </span>
                  ))}
                {allergens.split(",").length > 3 && (
                  <span style={{ fontSize: 15, color: "#991b1b" }}>
                    외 {allergens.split(",").length - 3}개
                  </span>
                )}
              </div>
            )}

            {isSafe && (
              <span style={{ fontSize: 16, color: "#15803d" }}>
                내 알레르기 성분이 없습니다
              </span>
            )}
          </div>
        </div>

        {/* 하단 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 36px",
            backgroundColor: "rgba(0,0,0,0.05)",
          }}
        >
          <span style={{ fontSize: 14, color: "#9ca3af" }}>
            {dataSource === "ai"
              ? "🤖 AI 분석 결과"
              : dataSource === "barcode"
                ? "📷 바코드 스캔 결과"
                : "🔍 식품 검색 결과"}
          </span>
          <span style={{ fontSize: 14, color: "#9ca3af" }}>pyeonharu.com</span>
        </div>
      </div>,
      {
        width: 800,
        height: 400,
      },
    );
  } catch (e) {
    return new Response("OG 이미지 생성 실패", { status: 500 });
  }
}
