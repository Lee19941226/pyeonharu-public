"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { MapPin, Loader2 } from "lucide-react"

// ─── 전역 타입 선언 ───
declare global {
  interface Window {
    naver: any
  }
}

// ─── 마커 데이터 타입 ───
export interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  isAiRecommended?: boolean
}

interface NaverMapProps {
  height?: string
  userLocation?: { lat: number; lng: number } | null
  markers?: MapMarker[]
  center?: { lat: number; lng: number }
  zoom?: number
  onMarkerClick?: (id: string) => void
  fitBounds?: boolean
}

// ─── naver.maps 준비 대기 ───
function waitForNaverMaps(timeout = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.naver?.maps) {
      resolve()
      return
    }
    const start = Date.now()
    const check = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(check)
        resolve()
      } else if (Date.now() - start > timeout) {
        clearInterval(check)
        reject(new Error("네이버 지도 API 로드 시간 초과. 인증 정보를 확인하세요."))
      }
    }, 100)
  })
}

// ─── 커스텀 마커 HTML ───
function createHospitalMarkerHtml(label: string, isAiRecommended: boolean): string {
  const bg = isAiRecommended ? "#16a34a" : "#2563eb"
  const border = isAiRecommended ? "#15803d" : "#1d4ed8"
  const truncated = label.length > 8 ? label.slice(0, 8) + "…" : label
  const badge = isAiRecommended
    ? `<span style="position:absolute;top:-8px;right:-8px;background:#f59e0b;color:#fff;font-size:9px;padding:1px 4px;border-radius:8px;font-weight:700;white-space:nowrap;">AI</span>`
    : ""

  return `
    <div style="position:relative;cursor:pointer;">
      ${badge}
      <div style="background:${bg};border:2px solid ${border};color:#fff;padding:4px 8px;border-radius:8px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);max-width:120px;overflow:hidden;text-overflow:ellipsis;">
        🏥 ${truncated}
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${bg};margin:0 auto;"></div>
    </div>
  `
}

function createUserMarkerHtml(): string {
  return `
    <div style="position:relative;">
      <div style="width:18px;height:18px;background:#f97316;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
      <div style="position:absolute;top:-2px;left:-2px;width:22px;height:22px;border-radius:50%;background:rgba(249,115,22,0.25);animation:pulse-ring 2s ease-out infinite;"></div>
    </div>
    <style>
      @keyframes pulse-ring {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(2.5); opacity: 0; }
      }
    </style>
  `
}

// ═══════════════════════════════════════
// NaverMap 컴포넌트
// ═══════════════════════════════════════
export function NaverMap({
  height = "200px",
  userLocation,
  markers = [],
  center,
  zoom = 14,
  onMarkerClick,
  fitBounds = true,
}: NaverMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerInstancesRef = useRef<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false) // ★ 핵심: 지도 준비 상태

  const clearMarkers = useCallback(() => {
    markerInstancesRef.current.forEach((m) => m.setMap(null))
    markerInstancesRef.current = []
  }, [])

  // ─── 지도 초기화 ───
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        await waitForNaverMaps()
        if (!mounted || !mapRef.current) return

        const naver = window.naver
        const defaultCenter = center
          || (userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null)
          || { lat: 37.3595, lng: 126.9354 }

        const map = new naver.maps.Map(mapRef.current, {
          center: new naver.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
          zoom,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
            style: naver.maps.ZoomControlStyle.SMALL,
          },
          mapTypeControl: false,
          scaleControl: false,
          logoControl: true,
          mapDataControl: false,
        })

        mapInstanceRef.current = map
        if (mounted) {
          setMapReady(true) // ★ 마커 useEffect 트리거
          setIsLoading(false)
        }
      } catch (err: any) {
        if (mounted) {
          console.error("[NaverMap] 초기화 실패:", err)
          setError(err.message || "지도를 불러올 수 없습니다.")
          setIsLoading(false)
        }
      }
    }

    init()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 마커 업데이트 (mapReady 의존성 추가) ───
  useEffect(() => {
    if (!mapReady) return // 지도 아직 준비 안 됨
    const map = mapInstanceRef.current
    const naver = window.naver
    if (!map || !naver?.maps) return

    clearMarkers()
    const bounds = new naver.maps.LatLngBounds()

    // 사용자 위치 마커 (주황)
    if (userLocation) {
      const pos = new naver.maps.LatLng(userLocation.lat, userLocation.lng)
      const userMarker = new naver.maps.Marker({
        position: pos,
        map,
        icon: {
          content: createUserMarkerHtml(),
          anchor: new naver.maps.Point(11, 11),
        },
        zIndex: 200,
      })
      markerInstancesRef.current.push(userMarker)
      bounds.extend(pos)
    }

    // 병원 마커 (파랑/초록)
    markers.forEach((m) => {
      const pos = new naver.maps.LatLng(m.lat, m.lng)
      const hospitalMarker = new naver.maps.Marker({
        position: pos,
        map,
        icon: {
          content: createHospitalMarkerHtml(m.label, !!m.isAiRecommended),
          anchor: new naver.maps.Point(40, 45),
        },
        zIndex: m.isAiRecommended ? 150 : 100,
      })

      if (onMarkerClick) {
        naver.maps.Event.addListener(hospitalMarker, "click", () => {
          onMarkerClick(m.id)
        })
      }

      markerInstancesRef.current.push(hospitalMarker)
      bounds.extend(pos)
    })

    // 범위 자동 조정
    if (fitBounds && (markers.length > 0 || userLocation)) {
      if (markers.length === 0 && userLocation) {
        map.setCenter(new naver.maps.LatLng(userLocation.lat, userLocation.lng))
        map.setZoom(zoom)
      } else if (center) {
        map.setCenter(new naver.maps.LatLng(center.lat, center.lng))
        map.setZoom(zoom)
      } else {
        map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
      }
    }
  }, [mapReady, userLocation, markers, center, zoom, fitBounds, onMarkerClick, clearMarkers])

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-xl border bg-muted/50" style={{ height }}>
        <div className="text-center text-sm text-muted-foreground p-4">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-destructive/40" />
          <p className="font-medium mb-1">지도를 표시할 수 없습니다</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-xl border" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p>지도를 불러오는 중...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
