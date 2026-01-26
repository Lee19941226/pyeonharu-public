"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CloudSun,
  Thermometer,
  Droplets,
  Wind,
  RefreshCw,
  Shirt,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
} from "lucide-react"
import Link from "next/link"

interface WeatherData {
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  condition: "sunny" | "cloudy" | "rainy" | "snowy"
  description: string
}

interface OutfitRecommendation {
  top: string
  bottom: string
  outer: string | null
  shoes: string
  accessories: string[]
  tips: string
}

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
}

export default function TodayPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [outfit, setOutfit] = useState<OutfitRecommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 날씨 및 코디 추천 시뮬레이션
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 샘플 날씨 데이터
      setWeather({
        temp: 8,
        feelsLike: 5,
        humidity: 45,
        wind: 3.2,
        condition: "cloudy",
        description: "구름 많음",
      })

      // 샘플 코디 추천
      setOutfit({
        top: "니트 스웨터 / 목폴라",
        bottom: "청바지 / 슬랙스",
        outer: "가벼운 코트 / 자켓",
        shoes: "스니커즈 / 로퍼",
        accessories: ["머플러", "장갑"],
        tips: "아침저녁으로 쌀쌀하니 겉옷을 챙기세요!",
      })

      setIsLoading(false)
    }

    loadData()
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setOutfit({
        top: "후드티 / 맨투맨",
        bottom: "면바지 / 조거팬츠",
        outer: "항공점퍼 / 패딩조끼",
        shoes: "운동화",
        accessories: ["볼캡"],
        tips: "활동적인 하루를 위한 편한 코디에요!",
      })
      setIsLoading(false)
    }, 800)
  }

  const WeatherIcon = weather ? weatherIcons[weather.condition] : CloudSun

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
              <Shirt className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">오늘 뭐 입지?</h1>
            <p className="mt-2 text-muted-foreground">
              오늘 날씨에 맞는 옷차림을 추천해드려요
            </p>
          </div>

          <div className="mx-auto max-w-2xl space-y-6">
            {/* Weather Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CloudSun className="h-5 w-5" />
                  오늘의 날씨
                </CardTitle>
                <CardDescription>서울특별시 기준</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : weather ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
                        <WeatherIcon className="h-10 w-10 text-accent" />
                      </div>
                      <div>
                        <p className="text-4xl font-bold">{weather.temp}°</p>
                        <p className="text-muted-foreground">{weather.description}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-muted-foreground" />
                        체감 {weather.feelsLike}°
                      </p>
                      <p className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                        습도 {weather.humidity}%
                      </p>
                      <p className="flex items-center gap-2">
                        <Wind className="h-4 w-4 text-muted-foreground" />
                        바람 {weather.wind}m/s
                      </p>
                    </div>
                  </div>
                ) : null}

                <Button variant="outline" asChild className="mt-4 w-full bg-transparent">
                  <Link href="/weather">날씨 상세 보기</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Outfit Recommendation */}
            <Card className="border-accent">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shirt className="h-5 w-5 text-accent" />
                    AI 추천 코디
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    다른 추천
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex h-48 items-center justify-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : outfit ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-muted p-4">
                        <p className="mb-1 text-sm text-muted-foreground">상의</p>
                        <p className="font-medium">{outfit.top}</p>
                      </div>
                      <div className="rounded-lg bg-muted p-4">
                        <p className="mb-1 text-sm text-muted-foreground">하의</p>
                        <p className="font-medium">{outfit.bottom}</p>
                      </div>
                      {outfit.outer && (
                        <div className="rounded-lg bg-muted p-4">
                          <p className="mb-1 text-sm text-muted-foreground">아우터</p>
                          <p className="font-medium">{outfit.outer}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-muted p-4">
                        <p className="mb-1 text-sm text-muted-foreground">신발</p>
                        <p className="font-medium">{outfit.shoes}</p>
                      </div>
                    </div>

                    {outfit.accessories.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm text-muted-foreground">추천 액세서리</p>
                        <div className="flex flex-wrap gap-2">
                          {outfit.accessories.map((acc) => (
                            <Badge key={acc} variant="secondary">
                              {acc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-accent/10 p-4">
                      <p className="text-sm font-medium text-accent">{outfit.tips}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <Link href="/closet">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Shirt className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">내 옷장 관리</p>
                      <p className="text-sm text-muted-foreground">
                        옷을 등록하고 더 정확한 추천받기
                      </p>
                    </div>
                  </CardContent>
                </Link>
              </Card>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <Link href="/history">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <CloudSun className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">코디 기록</p>
                      <p className="text-sm text-muted-foreground">
                        과거 코디 기록 확인하기
                      </p>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
