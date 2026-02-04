import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.NAVER_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/naver/callback`
  const state = Math.random().toString(36).substring(7)
  
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  return NextResponse.redirect(naverAuthUrl)
}
