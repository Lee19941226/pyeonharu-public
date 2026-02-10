import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Vercel Cron 보안: CRON_SECRET 검증
const CRON_SECRET = process.env.CRON_SECRET || "";

// 나이스 알레르기 번호 → 알레르기명 매핑 (meals/route.ts와 동일)
const NEIS_ALLERGEN_MAP: Record<string, string> = {
  "1": "계란",
  "2": "우유",
  "3": "메밀",
  "4": "땅콩",
  "5": "대두",
  "6": "밀",
  "7": "고등어",
  "8": "게",
  "9": "새우",
  "10": "돼지고기",
  "11": "복숭아",
  "12": "토마토",
  "13": "아황산류",
  "14": "호두",
  "15": "닭고기",
  "16": "쇠고기",
  "17": "오징어",
  "18": "조개류",
  "19": "잣",
};

interface ParsedMenuItem {
  name: string;
  allergenNumbers: string[];
  allergenNames: string[];
}

interface MatchedMenuItem {
  name: string;
  status: "safe" | "danger";
  matchedAllergens: string[];
}

interface SchoolResult {
  schoolName: string;
  mealTypeName: string;
  calInfo: string;
  menuItems: MatchedMenuItem[];
  hasDanger: boolean;
}

function parseMenuItem(raw: string): ParsedMenuItem {
  const cleaned = raw.replace(/<br\s*\/?>/gi, "").trim();
  const parenMatch = cleaned.match(/^(.+?)\s*\(([\d]+(?:\.[\d]+)*\.?)\)\s*$/);
  if (parenMatch) {
    const name = parenMatch[1].replace(/\*$/, "").trim();
    const numbers = parenMatch[2]
      .split(".")
      .filter((n: string) => n.trim() !== "");
    const names = numbers
      .map((n: string) => NEIS_ALLERGEN_MAP[n] || "")
      .filter(Boolean);
    return { name, allergenNumbers: numbers, allergenNames: names };
  }
  const match = cleaned.match(/^(.+?)[\s*]*([\d]+(?:\.[\d]+)*\.?)$/);
  if (match) {
    const name = match[1].replace(/\*$/, "").trim();
    const numbers = match[2].split(".").filter((n: string) => n.trim() !== "");
    const names = numbers
      .map((n: string) => NEIS_ALLERGEN_MAP[n] || "")
      .filter(Boolean);
    return { name, allergenNumbers: numbers, allergenNames: names };
  }
  return { name: cleaned, allergenNumbers: [], allergenNames: [] };
}

// Gmail SMTP 트랜스포터
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// 이메일 HTML 생성
function buildEmailHTML(
  schoolName: string,
  mealTypeName: string,
  calInfo: string,
  menuItems: MatchedMenuItem[],
  hasDanger: boolean,
): string {
  const dangerItems = menuItems.filter(
    (m: MatchedMenuItem) => m.status === "danger",
  );
  const safeItems = menuItems.filter(
    (m: MatchedMenuItem) => m.status === "safe",
  );

  const headerColor = hasDanger ? "#DC2626" : "#16A34A";
  const headerEmoji = hasDanger ? "⚠️" : "✅";
  const headerText = hasDanger
    ? `주의! 알레르기 유발 메뉴 ${dangerItems.length}개`
    : "오늘 급식은 안전해요!";

  const dangerHTML =
    dangerItems.length > 0
      ? `<div style="margin:16px 0;padding:12px;background:#FEF2F2;border-radius:8px;border-left:4px solid #DC2626;">
        <p style="margin:0 0 8px;font-weight:600;color:#DC2626;">🚨 주의 메뉴</p>
        ${dangerItems
          .map(
            (d: MatchedMenuItem) =>
              `<p style="margin:4px 0;color:#991B1B;">• <strong>${d.name}</strong> — ${d.matchedAllergens.join(", ")}</p>`,
          )
          .join("")}
       </div>`
      : "";

  const safeHTML =
    safeItems.length > 0
      ? `<div style="margin:16px 0;padding:12px;background:#F0FDF4;border-radius:8px;border-left:4px solid #16A34A;">
        <p style="margin:0 0 8px;font-weight:600;color:#16A34A;">✅ 안전 메뉴</p>
        ${safeItems
          .map(
            (s: MatchedMenuItem) =>
              `<p style="margin:4px 0;color:#166534;">• ${s.name}</p>`,
          )
          .join("")}
       </div>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#1F2937;">
  
  <div style="text-align:center;padding:20px 0;border-bottom:1px solid #E5E7EB;">
    <h1 style="margin:0;font-size:20px;color:#F59E0B;">🍱 편하루 급식 알림</h1>
  </div>

  <div style="padding:24px 0;">
    <div style="text-align:center;padding:16px;background:${headerColor}10;border-radius:12px;margin-bottom:16px;">
      <p style="margin:0;font-size:24px;">${headerEmoji}</p>
      <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:${headerColor};">${headerText}</p>
    </div>

    <div style="padding:12px;background:#F9FAFB;border-radius:8px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#6B7280;">🏫 <strong>${schoolName}</strong></p>
      <p style="margin:4px 0 0;font-size:13px;color:#9CA3AF;">${mealTypeName}${calInfo ? ` · ${calInfo}` : ""}</p>
    </div>

    ${dangerHTML}
    ${safeHTML}
  </div>

  <div style="border-top:1px solid #E5E7EB;padding:16px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;">편하루 — 알레르기 안심 급식 알림</p>
    <p style="margin:4px 0 0;font-size:11px;color:#D1D5DB;">이 메일은 등록된 학교의 급식 알레르기 체크 결과입니다.</p>
  </div>

</body>
</html>`;
}

export async function GET(req: NextRequest) {
  try {
    // Vercel Cron 보안 검증
    const authHeader = req.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Supabase Admin 클라이언트 (서비스 키로 모든 사용자 조회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. 학교 등록한 모든 사용자 조회
    const { data: allSchools, error: schoolError } = await supabase
      .from("user_schools")
      .select("*");

    if (schoolError || !allSchools || allSchools.length === 0) {
      return NextResponse.json({ message: "등록된 학교가 없습니다.", sent: 0 });
    }

    // 2. 사용자별로 그룹핑
    const userSchoolMap = new Map<string, typeof allSchools>();
    for (const school of allSchools) {
      const existing = userSchoolMap.get(school.user_id) || [];
      existing.push(school);
      userSchoolMap.set(school.user_id, existing);
    }

    const today = new Date();
    // 주말 체크 (토/일은 급식 없음)
    const dayOfWeek = today.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        message: "주말에는 급식 알림을 보내지 않습니다.",
        sent: 0,
      });
    }

    const todayStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const transporter = createTransporter();
    let sentCount = 0;
    let errorCount = 0;

    // 3. 사용자별로 처리
    for (const [userId, schools] of userSchoolMap) {
      try {
        // 사용자 이메일 조회
        const { data: userData } =
          await supabase.auth.admin.getUserById(userId);
        const userEmail = userData?.user?.email;
        if (!userEmail) continue;

        // 사용자 알레르기 조회
        const { data: userAllergens } = await supabase
          .from("user_allergies")
          .select("allergen_name")
          .eq("user_id", userId);

        const userAllergenNames: string[] = (userAllergens || []).map(
          (a: { allergen_name: string }) => a.allergen_name,
        );

        // 알레르기 등록 안 한 사용자는 스킵
        if (userAllergenNames.length === 0) continue;

        // 각 학교별 급식 체크
        const schoolResults: SchoolResult[] = [];

        for (const school of schools) {
          try {
            // 나이스 API 호출
            const apiKey = process.env.NEIS_API_KEY || "";
            const url = new URL(
              "https://open.neis.go.kr/hub/mealServiceDietInfo",
            );
            url.searchParams.append("Type", "json");
            url.searchParams.append("pIndex", "1");
            url.searchParams.append("pSize", "10");
            url.searchParams.append("ATPT_OFCDC_SC_CODE", school.office_code);
            url.searchParams.append("SD_SCHUL_CODE", school.school_code);
            url.searchParams.append("MLSV_YMD", todayStr);
            if (apiKey) url.searchParams.append("KEY", apiKey);

            const res = await fetch(url.toString());
            const data = await res.json();
            const rows = data?.mealServiceDietInfo?.[1]?.row || [];

            if (rows.length === 0) continue;

            for (const row of rows) {
              const rawDish: string = row.DDISH_NM || "";
              const menuItems: string[] = rawDish
                .split(/<br\s*\/?>/gi)
                .filter((s: string) => s.trim());
              const parsedMenu: ParsedMenuItem[] = menuItems.map(parseMenuItem);

              // 알레르기 매칭
              const matchedMenu: MatchedMenuItem[] = parsedMenu.map(
                (item: ParsedMenuItem) => {
                  const matched: string[] = item.allergenNames.filter(
                    (name: string) =>
                      userAllergenNames.some(
                        (ua: string) => name.includes(ua) || ua.includes(name),
                      ),
                  );
                  return {
                    name: item.name,
                    status: (matched.length > 0 ? "danger" : "safe") as
                      | "safe"
                      | "danger",
                    matchedAllergens: matched,
                  };
                },
              );

              const hasDanger = matchedMenu.some(
                (m: MatchedMenuItem) => m.status === "danger",
              );

              schoolResults.push({
                schoolName: school.school_name,
                mealTypeName: row.MMEAL_SC_NM || "급식",
                calInfo: row.CAL_INFO || "",
                menuItems: matchedMenu,
                hasDanger,
              });
            }
          } catch (e) {
            console.error(
              `[Cron] 학교 급식 조회 실패: ${school.school_name}`,
              e,
            );
          }
        }

        // 급식 정보 없으면 스킵
        if (schoolResults.length === 0) continue;

        // 4. 이메일 발송 (학교별로 하나의 이메일)
        const hasAnyDanger = schoolResults.some(
          (r: SchoolResult) => r.hasDanger,
        );
        const subject = hasAnyDanger
          ? `⚠️ [편하루] 오늘 급식에 알레르기 주의 메뉴가 있어요!`
          : `✅ [편하루] 오늘 급식은 안전해요!`;

        // 여러 학교면 합쳐서 보냄
        const htmlParts: string[] = schoolResults.map((r: SchoolResult) =>
          buildEmailHTML(
            r.schoolName,
            r.mealTypeName,
            r.calInfo,
            r.menuItems,
            r.hasDanger,
          ),
        );

        // 여러 학교를 하나의 이메일로 합침
        let combinedHTML: string;

        if (htmlParts.length === 1) {
          combinedHTML = htmlParts[0];
        } else {
          combinedHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;padding:20px;color:#1F2937;">
  <div style="text-align:center;padding:20px 0;border-bottom:1px solid #E5E7EB;">
    <h1 style="margin:0;font-size:20px;color:#F59E0B;">🍱 편하루 급식 알림</h1>
    <p style="margin:8px 0 0;font-size:13px;color:#9CA3AF;">등록된 학교 ${schoolResults.length}개의 급식 결과입니다</p>
  </div>
  ${schoolResults
    .map((r: SchoolResult) => {
      const dangerItems: MatchedMenuItem[] = r.menuItems.filter(
        (m: MatchedMenuItem) => m.status === "danger",
      );
      const safeItems: MatchedMenuItem[] = r.menuItems.filter(
        (m: MatchedMenuItem) => m.status === "safe",
      );
      const headerColor = r.hasDanger ? "#DC2626" : "#16A34A";
      const headerEmoji = r.hasDanger ? "⚠️" : "✅";
      const headerText = r.hasDanger
        ? `주의 메뉴 ${dangerItems.length}개`
        : "안전";

      return `
    <div style="padding:20px 0;border-bottom:1px solid #F3F4F6;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:18px;">${headerEmoji}</span>
        <div>
          <p style="margin:0;font-size:15px;font-weight:700;">${r.schoolName}</p>
          <p style="margin:2px 0 0;font-size:12px;color:${headerColor};font-weight:600;">${headerText}</p>
        </div>
      </div>
      <p style="margin:0 0 8px;font-size:12px;color:#9CA3AF;">${r.mealTypeName}${r.calInfo ? ` · ${r.calInfo}` : ""}</p>
      ${
        dangerItems.length > 0
          ? `<div style="padding:8px 12px;background:#FEF2F2;border-radius:6px;margin-bottom:8px;">
        ${dangerItems.map((d: MatchedMenuItem) => `<p style="margin:3px 0;font-size:13px;color:#991B1B;">🚨 <strong>${d.name}</strong> — ${d.matchedAllergens.join(", ")}</p>`).join("")}
      </div>`
          : ""
      }
      <div style="padding:8px 12px;background:#F0FDF4;border-radius:6px;">
        ${safeItems.map((s: MatchedMenuItem) => `<p style="margin:3px 0;font-size:13px;color:#166534;">✅ ${s.name}</p>`).join("")}
      </div>
    </div>`;
    })
    .join("")}
  <div style="padding:16px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;">편하루 — 알레르기 안심 급식 알림</p>
  </div>
</body>
</html>`;
        }

        await transporter.sendMail({
          from: `"편하루" <${process.env.GMAIL_USER}>`,
          to: userEmail,
          subject,
          html: combinedHTML,
        });

        sentCount++;
      } catch (e) {
        console.error(`[Cron] 사용자 처리 실패: ${userId}`, e);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `급식 알림 발송 완료`,
      sent: sentCount,
      errors: errorCount,
      totalUsers: userSchoolMap.size,
      date: todayStr,
    });
  } catch (error) {
    console.error("[Cron] Fatal error:", error);
    return NextResponse.json(
      { error: "급식 알림 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
