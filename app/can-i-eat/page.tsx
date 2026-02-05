"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CanIEatRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.get("q");
    const mode = searchParams.get("mode");

    if (mode === "camera") {
      router.replace("/food/camera");
    } else if (q) {
      router.replace(`/food/search?q=${q}`);
    } else {
      router.replace("/food");
    }
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p>잠시만 기다려주세요...</p>
    </div>
  );
}
