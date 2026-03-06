import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "편하루 - 식품 알레르기 안전 관리 서비스";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          gap: "32px",
        }}
      >
        <div
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            color: "#16a34a",
          }}
        >
          편하루
        </div>
        <div
          style={{
            fontSize: "36px",
            color: "#374151",
          }}
        >
          식품 알레르기 안전 관리 서비스
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#9ca3af",
          }}
        >
          pyeonharu.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
