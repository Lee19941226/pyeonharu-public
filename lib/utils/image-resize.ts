const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;
const JPEG_QUALITY = 0.85;
const MAX_FILE_SIZE_MB = 4; // 이 이하면 리사이즈 스킵

export interface ResizeResult {
  base64: string; // data: prefix 제거된 순수 base64
  mimeType: string;
  originalSizeMB: number;
  resizedSizeMB: number;
  wasResized: boolean;
}

/**
 * File → 리사이즈된 base64 변환
 */
export async function resizeImageForAI(file: File): Promise<ResizeResult> {
  const originalSizeMB = file.size / (1024 * 1024);

  // ✅ 4MB 이하 + 이미지 크기 확인 불필요 → 빠른 경로
  // 크기 체크는 실제 픽셀 기준으로 하므로 일단 로드
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const { width, height } = img;
        const needsResize =
          width > MAX_WIDTH ||
          height > MAX_HEIGHT ||
          originalSizeMB > MAX_FILE_SIZE_MB;

        if (!needsResize) {
          // 리사이즈 불필요 → 그대로 반환
          const base64 = dataUrl.includes(",")
            ? dataUrl.split(",")[1]
            : dataUrl;
          resolve({
            base64,
            mimeType: file.type || "image/jpeg",
            originalSizeMB,
            resizedSizeMB: originalSizeMB,
            wasResized: false,
          });
          return;
        }

        // ✅ Canvas로 리사이즈
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        // 비율 유지하면서 최대 크기 계산
        let newWidth = width;
        let newHeight = height;

        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          newWidth = Math.round(width * ratio);
          newHeight = Math.round(height * ratio);
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        // 화이트 배경 (PNG → JPEG 변환 시 투명 배경 방지)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // JPEG로 압축 출력
        const resizedDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = resizedDataUrl.split(",")[1];
        const resizedSizeMB = (base64.length * 0.75) / (1024 * 1024);

        console.log(
          `[ImageResize] ${width}x${height} → ${newWidth}x${newHeight}`,
          `| ${originalSizeMB.toFixed(2)}MB → ${resizedSizeMB.toFixed(2)}MB`,
        );

        resolve({
          base64,
          mimeType: "image/jpeg",
          originalSizeMB,
          resizedSizeMB,
          wasResized: true,
        });
      };

      img.onerror = () => reject(new Error("이미지를 로드할 수 없습니다"));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다"));
    reader.readAsDataURL(file);
  });
}
