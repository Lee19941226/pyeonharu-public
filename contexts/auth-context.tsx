"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthUser {
  id: string
  email: string
  name: string
  provider?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isLoginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const mapUser = (supabaseUser: User): AuthUser => ({
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || "사용자",
    provider: supabaseUser.app_metadata?.provider,
  })

  const refreshUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    if (supabaseUser) {
      setUser(mapUser(supabaseUser))
    } else {
      setUser(null)
    }
  }, [])

  // 중복 로그인 감지 시 한 번만 처리하기 위한 플래그
  const duplicateLoginHandled = useRef(false)

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      await refreshUser()
      setIsLoading(false)
    }
    initAuth()

    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(mapUser(session.user))
        } else {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [refreshUser])

  // 글로벌 fetch 인터셉터: duplicate_login 401 응답 감지
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)

      // /api/ 경로에 대한 401 응답만 검사
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : ""
      if (response.status === 401 && url.includes("/api/")) {
        try {
          const cloned = response.clone()
          const body = await cloned.json()
          if (body?.error === "duplicate_login" && !duplicateLoginHandled.current) {
            duplicateLoginHandled.current = true
            const supabase = createClient()
            await supabase.auth.signOut()
            setUser(null)
            window.location.href = "/login?reason=duplicate_login"
          }
        } catch {
          // JSON 파싱 실패 시 무시
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true)
  }, [])

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false)
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoginModalOpen,
        openLoginModal,
        closeLoginModal,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
