import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ??IP ?リ옇?↑????т빳?껊돥筌뤾쑴逾????노뼌 ???ル┰ (嶺뚮∥???꾨뎨? ?臾믪쪡亦???⑥쥙???꾩렮維쀥젆?
const ipScanMap = new Map<string, number>();
// 嶺뚮씞???띠쾸????댁굥?????筌먲퐘遊?
setInterval(
  () => {
    ipScanMap.clear();
  },
  60 * 60 * 1000,
);

// ????? 嶺뚮ㅄ維獄?嶺?흮??(60??TTL, 嶺???븐슙??DB ?브퀗????꾩렮維?)
let maintenanceCache: {
  enabled: boolean;
  message: string;
  endTime: string | null;
  whitelistIds: string[];
  whitelistIps: string[];
  fetchedAt: number;
} | null = null;

const MAINTENANCE_CACHE_TTL = 60_000; // 60??

async function getMaintenanceSettings(): Promise<typeof maintenanceCache> {
  const now = Date.now();
  if (maintenanceCache && now - maintenanceCache.fetchedAt < MAINTENANCE_CACHE_TTL) {
    return maintenanceCache;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.error("[maintenance] ???삵렱?곌떠?????怨몃쾳:", { supabaseUrl: !!supabaseUrl, anonKey: !!anonKey });
      return null;
    }

    // Edge Runtime ?筌뤿굞?? raw fetch??Supabase REST API 嶺뚯쉳????筌뤾쑵??(?熬곣뫕???브퀗?????2??怨좊쾪)
    const res = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?select=key,value`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("[maintenance] REST API ???덉넮:", res.status, body);
      if (maintenanceCache) return maintenanceCache;
      return null;
    }

    const rows: { key: string; value: any }[] = await res.json();
    console.log("[maintenance] DB ?브퀗????롪퍒???", JSON.stringify(rows));

    const modeRow = rows.find((r) => r.key === "maintenance_mode");
    const wlRow = rows.find((r) => r.key === "whitelist_user_ids");
    const ipRow = rows.find((r) => r.key === "whitelist_ips");

    maintenanceCache = {
      enabled: modeRow?.value?.enabled ?? false,
      message: modeRow?.value?.message ?? "",
      endTime: modeRow?.value?.endTime ?? null,
      whitelistIds: Array.isArray(wlRow?.value) ? wlRow.value : [],
      whitelistIps: Array.isArray(ipRow?.value) ? ipRow.value : [],
      fetchedAt: now,
    };

    return maintenanceCache;
  } catch (err) {
    console.error("[maintenance] DB ?브퀗??????덉넮:", err);
    if (maintenanceCache) return maintenanceCache;
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  // ==========================================
  // CSRF ?꾩렮維쀥젆? mutation ??븐슙???Origin ???녹맠 ?롪틵?嶺?
  // ==========================================
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json(
        { error: "CSRF ?롪틵?嶺????덉넮: ???깅뮔??? ??? ?怨쀫츋????낅퉵??" },
        { status: 403 },
      );
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================
  // 繞벿살탮???β돦裕????롪틵?嶺?(?筌뤾쑬????ルㅎ荑??????
  // ==========================================
  const pathname = request.nextUrl.pathname;
  const skipSessionCheck =
    pathname.startsWith("/login") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/portfolio/");

  // ==========================================
  // 繞벿살탮???β돦裕????롪틵?嶺?(API ??븐슙?????ｇ춯?????瑜곷턄嶺뚯솘? ?β돦裕녻キ??繹먮굝裕??곌랜???
  // ==========================================
  const isApiRequest = pathname.startsWith("/api/");

  if (user && !skipSessionCheck && isApiRequest) {
    const sessionTokenCookie = request.cookies.get("session_token")?.value;

    // ?臾믪쪡亦????깅굵 ???異??롪틵?嶺?(??怨몃さ嶺????꾨븕 ???β돦裕???嶺뚯쉳???WebView ?臾믪쪡亦???怨룸? ????
    if (sessionTokenCookie) {
      try {
        const { data, error } = await supabase
          .from("active_sessions")
          .select("session_token")
          .eq("user_id", user.id)
          .single();

        // DB?????뀀쭨????怨몃쾳 ?????깅뮔 (?熬곣뫗異??筌뤾쑬???繹먮굞夷???
        // ?臾믩닑?????덉넮 ??fail-open
        const isValid = error || !data ? true : data.session_token === sessionTokenCookie;

        if (!isValid) {
          const apiResponse = NextResponse.json(
            { error: "duplicate_login", message: "???섎??リ옇?쀧뵳??????β돦裕??筌뤾퍓????β돦裕??熬곣뫗???琉????鍮??" },
            { status: 401 },
          );
          apiResponse.cookies.delete("session_token");
          return apiResponse;
        }
      } catch {
        // DB ?臾믩닑?????덉넮 ??fail-open (??얜∥?????깅뮔)
      }
    }
  }

  // ==========================================
  // ????⑤객臾?嶺뚳퐢?얍칰?(?β돦裕?????????異?
  // ==========================================
  const banBypass = ["/banned", "/login", "/auth/", "/api/auth/", "/api/admin/"];
  const isBanBypassPath = banBypass.some((p) => pathname.startsWith(p));

  if (user && !isBanBypassPath) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && anonKey) {
        const banRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?select=is_banned,ban_until&id=eq.${user.id}`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${anonKey}`,
            },
            cache: "no-store",
          },
        );

        if (banRes.ok) {
          const rows: { is_banned: boolean; ban_until: string | null }[] = await banRes.json();
          const profile = rows[0];

          if (profile?.is_banned) {
            // ban_until??嶺뚯솘?????얠춺????吏???怨몄젷
            if (profile.ban_until && new Date(profile.ban_until) < new Date()) {
              // ???吏???怨몄젷: service role ??怨몃턄 anon key?β돦裕??update ?釉띾쐝??????
              // /api/admin/users/unban ?筌뤾쑵?????? ?잙갭梨뜻틦????沅???ろ뀞??
              // ??????怨룹꽘?筌뤾쑬??????吏???怨몄젷 嶺뚳퐣瑗??
              // Edge?????service_role ?????釉띾쐝? ?????沅????깅뮔
            } else {
              const url = request.nextUrl.clone();
              url.pathname = "/banned";
              return NextResponse.redirect(url);
            }
          }
        }
      }
    } catch {
      // fail-open: DB ?臾믩닑?????덉넮 ????얜∥?????깅뮔
    }
  }

  // ==========================================
  // ??? 嶺뚮ㅄ維獄?嶺뚳퐢?얍칰?
  // ==========================================
  const maintenanceBypass = ["/maintenance", "/admin", "/api/admin/", "/login", "/auth/", "/api/auth/"];
  const isBypassPath = maintenanceBypass.some((p) => pathname.startsWith(p));

  // ??븐뼚?붷윜? 嶺뚮ㅄ維獄???얜Ŧ堉????? 嶺뚮ㅄ維獄???⑤객臾????녹맠 ?怨뺣뼺?
  let debugMaintenanceStatus = "skip:bypass";

  if (!isBypassPath) {
    const maint = await getMaintenanceSettings();
    debugMaintenanceStatus = maint
      ? `enabled:${maint.enabled}`
      : "fetch:null";

    if (maint?.enabled) {
      // ??븐슦逾?筌뤾봇遊???덈콦 ????????裕?IP嶺????沅?(??㉱?洹먮봿???????熬곣뫗??嶺뚢뼰維??
      const clientIp =
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "";
      const isUserWhitelisted = user ? maint.whitelistIds.includes(user.id) : false;
      const isIpWhitelisted = clientIp ? maint.whitelistIps.includes(clientIp) : false;
      const isWhitelisted = isUserWhitelisted || isIpWhitelisted;
      debugMaintenanceStatus += `,wl:${isWhitelisted},ip:${clientIp},wlIps:${JSON.stringify(maint.whitelistIps)}`;
      if (!isWhitelisted) {
        const url = request.nextUrl.clone();
        url.pathname = "/maintenance";
        const redirectRes = NextResponse.redirect(url);
        redirectRes.headers.set("x-maintenance-debug", debugMaintenanceStatus);
        return redirectRes;
      }
    }
  }

  supabaseResponse.headers.set("x-maintenance-debug", debugMaintenanceStatus);

  // ==========================================
  // ?곌랜????롪퍔?δ빳?嶺뚳퐢?얍칰?
  // ==========================================
  const protectedPaths = [
    "/mypage", // 嶺뚮씭????瑜곷턄嶺뚯솘?
    "/bookmarks", // 嶺뚯빖횧?곗눦???롡뵛
    "/food/profile", // ??釉? ?熬곣뫁夷??
    "/family", // ?띠럾?????㉱??
    "/admin", // ??㉱?洹먮봿??
    "/reports", // ?낅슣?딂??洹먮뿫竊??
    "/community/write", // ?롪퍓???룸Ь? ??얜???
  ];

  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // ==========================================
  // ???т빳?껊돥筌뤾쑴逾????노뼌 ???ル┰ 嶺뚳퐢?얍칰?(IP ?リ옇?↑? ??10??
  // ==========================================
  if (!user && request.nextUrl.pathname === "/api/food/analyze-image") {
    const today = new Date().toISOString().split("T")[0];
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ipKey = `scan:${clientIp}:${today}`;
    const ipCount = ipScanMap.get(ipKey) || 0;

    if (ipCount >= 1) {
      return NextResponse.json(
        {
          success: false,
          error: "scan_limit_exceeded",
          message:
            "??源녿뎄 ???筌??釉뚯뫒?????낅빢(1?????貫?????곕????덈펲. ?β돦裕??筌뤿굝由??類쏅듆 ??嶺뚮씭?????????????곗꽑??",
          remainingScans: 0,
        },
        { status: 429 },
      );
    }

    ipScanMap.set(ipKey, ipCount + 1);
  }

  return supabaseResponse;
}