import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=naver_auth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // 1. 네이버에서 access token 받기
    const tokenResponse = await fetch("https://nid.naver.com/oauth2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code: code,
        state: state || "",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("Naver token error:", tokenData);
      return NextResponse.redirect(`${origin}/login?error=token_failed`);
    }

    // 2. 네이버 사용자 정보 가져오기
    const userResponse = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (userData.resultcode !== "00") {
      console.error("Naver user info error:", userData);
      return NextResponse.redirect(`${origin}/login?error=user_info_failed`);
    }

    const naverUser = userData.response;
    const email = naverUser.email;
    const name = naverUser.name || naverUser.nickname || "사용자";
    const naverId = naverUser.id;

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=no_email`);
    }

    // 3. Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // 네이버 사용자 전용 비밀번호 (고정 해시 - 사용자는 모름)
    const naverPassword = `naver_${naverId}_${process.env.SUPABASE_SERVICE_ROLE_KEY!.slice(-10)}`;

    // 이메일로 기존 사용자 확인
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (existingUser) {
      const isNaverUser = existingUser.user_metadata?.provider === "naver";

      if (!isNaverUser) {
        return NextResponse.redirect(`${origin}/login?error=email_exists`);
      }

      // 비밀번호 업데이트 (매번 동일한 값이지만 확실하게)
      await supabaseAdmin.auth.admin.updateUser(existingUser.id, {
        password: naverPassword,
      });
    } else {
      // 새 사용자 생성
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: naverPassword,
          email_confirm: true,
          user_metadata: {
            name: name,
            provider: "naver",
            naver_id: naverId,
          },
        });

      if (createError || !newUser.user) {
        console.error("Create user error:", createError);
        return NextResponse.redirect(`${origin}/login?error=signup_failed`);
      }
    }

    // 4. Supabase 서버 클라이언트로 로그인 (쿠키 자동 설정)
    const supabase = await createServerClient();
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: email,
        password: naverPassword,
      });

    if (signInError || !signInData.session) {
      console.error("Sign in error:", signInError);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }

    // 5. 홈으로 리다이렉트
    return NextResponse.redirect(origin);
  } catch (error) {
    console.error("Naver auth error:", error);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }
}
