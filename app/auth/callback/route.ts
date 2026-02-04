import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  // PKCE flow - code exchange (OAuth 등)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // recovery 타입이면 비밀번호 재설정 페이지로
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Token hash flow (password recovery, email confirmation)
  if (token_hash) {
    if (type === 'recovery') {
      // 비밀번호 재설정
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      
      if (!error) {
        return NextResponse.redirect(`${origin}/reset-password`)
      } else {
        return NextResponse.redirect(`${origin}/forgot-password?error=link_expired`)
      }
    }
    
    if (type === 'signup' || type === 'email') {
      // 이메일 인증
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email',
      })
      
      if (!error) {
        return NextResponse.redirect(`${origin}/login?verified=true`)
      }
    }
  }

  // 에러 파라미터가 있는 경우 처리
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  
  if (error) {
    if (error === 'access_denied' && errorDescription?.includes('expired')) {
      return NextResponse.redirect(`${origin}/forgot-password?error=link_expired`)
    }
    return NextResponse.redirect(`${origin}/login?error=${error}`)
  }

  // 기본: 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
