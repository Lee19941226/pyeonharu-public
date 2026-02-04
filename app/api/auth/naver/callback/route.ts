import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=naver_auth_failed`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  try {
    // 1. 네이버에서 access token 받기
    const tokenResponse = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.NAVER_CLIENT_ID!,
        client_secret: process.env.NAVER_CLIENT_SECRET!,
        code: code,
        state: state || '',
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Naver token error:', tokenData)
      return NextResponse.redirect(`${origin}/login?error=token_failed`)
    }

    // 2. 네이버 사용자 정보 가져오기
    const userResponse = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    if (userData.resultcode !== '00') {
      console.error('Naver user info error:', userData)
      return NextResponse.redirect(`${origin}/login?error=user_info_failed`)
    }

    const naverUser = userData.response
    const email = naverUser.email
    const name = naverUser.name || naverUser.nickname || '사용자'
    const naverId = naverUser.id

    if (!email) {
      return NextResponse.redirect(`${origin}/login?error=no_email`)
    }

    // 3. Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 이메일로 기존 사용자 확인
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    let user

    if (existingUser) {
      // 기존 사용자가 네이버로 가입했는지 확인
      const isNaverUser = existingUser.user_metadata?.provider === 'naver'
      
      if (!isNaverUser) {
        // 이메일로 가입한 사용자 - 에러
        return NextResponse.redirect(`${origin}/login?error=email_exists`)
      }
      
      user = existingUser
    } else {
      // 새 사용자 생성
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          name: name,
          provider: 'naver',
          naver_id: naverId,
        },
      })

      if (createError || !newUser.user) {
        console.error('Create user error:', createError)
        return NextResponse.redirect(`${origin}/login?error=signup_failed`)
      }

      user = newUser.user
    }

    // 4. 세션 직접 생성
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({
      userId: user.id,
    })

    if (sessionError || !sessionData.session) {
      console.error('Session creation error:', sessionError)
      return NextResponse.redirect(`${origin}/login?error=session_failed`)
    }

    // 5. 쿠키에 세션 저장
    const response = NextResponse.redirect(origin)
    
    // Supabase 세션 쿠키 설정
    response.cookies.set('sb-cdaljcqyhvzmeheinfjt-auth-token', JSON.stringify({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + sessionData.session.expires_in,
      expires_in: sessionData.session.expires_in,
      token_type: 'bearer',
      user: sessionData.session.user,
    }), {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionData.session.expires_in,
    })

    return response

  } catch (error) {
    console.error('Naver auth error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }
}
