import { NextResponse } from "next/server";

export function apiError(
  status: number,
  errorCode: string,
  error: string,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      error,
      errorCode,
      ...(extra || {}),
    },
    { status },
  );
}
