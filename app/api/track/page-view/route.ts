import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/utils/action-log";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = body.path as string | undefined;

    if (!path) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const geoRegion = typeof body._geo_region === "string" ? body._geo_region : undefined;
    const geoSource = typeof body._geo_source === "string" ? body._geo_source : undefined;

    logAction({
      userId: user?.id || null,
      actionType: "page_view",
      metadata: { path },
      geoRegion,
      geoSource,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
