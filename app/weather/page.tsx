"use client"

import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Droplets,
  Wind,
  Umbrella,
  Shirt,
} from "lucide-react"

const hourlyForecast = [
  { time: "09시", temp: 5, icon: Cloud },
  { time: "12시", temp: 8, icon: Sun },
  { time: "15시", temp: 10, icon: Sun },
  { time: "18시", temp: 7, icon: Cloud },
  { time: "21시", temp: 4, icon: Cloud },
]

const weeklyForecast = [
  { day: "오늘", high: 10, low: 3, icon: Cloud, condition: "구름 많음" },
  { day: "내일", high: 12, low: 4, icon: Sun, condition: "맑음" },
  { day: "모레", high: 8, low: 2, icon: CloudRain, condition: "비" },
  { day: "목요일", high: 7, low: 1, icon: Cloud, condition: "흐림" },
  { day: "금요일", high: 9, low: 3, icon: Sun, condition: "맑음" },
  { day: "토요일", high: 11, low: 5, icon: Sun, condition: "맑음" },
  { day: "일요일", high: 10, low: 4, icon: Cloud, condition: "구름 조금" },
]

const outfitTips = [
  { temp: "15도 이상", tip: "얇은 긴팔, 가디건" },
  { temp: "10~15도", tip: "니트, 자켓, 가벼운 코트" },
  { temp: "5~10도", tip: "코트, 두꺼운 니트, 목도리" },
  { temp: "5도 이하", tip: "패딩, 두꺼운 코트, 방한용품" },
]

export default function WeatherPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Current Weather */}
            <Card>
              <CardHeader>
                <CardTitle>현재 날씨</CardTitle>
                <CardDescription>서울특별시</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                  <div className="flex items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
                      <Cloud className="h-12 w-12 text-accent" />
                    </div>
                    <div>
                      <p className="text-5xl font-bold">8°</p>
                      <p className="text-lg text-muted-foreground">구름 많음</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <Thermometer className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">체감온도</p>
                      <p className="font-medium">5°</p>
                    </div>
                    <div className="text-center">
                      <Droplets className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">습도</p>
                      <p className="font-medium">45%</p>
                    </div>
                    <div className="text-center">
                      <Wind className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">바람</p>
                      <p className="font-medium">3.2m/s</p>
                    </div>
                    <div className="text-center">
                      <Umbrella className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">강수확률</p>
                      <p className="font-medium">10%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hourly Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>시간대별 날씨</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {hourlyForecast.map((hour) => (
                    <div
                      key={hour.time}
                      className="flex min-w-[80px] flex-col items-center rounded-lg bg-muted p-3"
                    >
                      <p className="text-sm text-muted-foreground">{hour.time}</p>
                      <hour.icon className="my-2 h-6 w-6" />
                      <p className="font-medium">{hour.temp}°</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>주간 날씨</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weeklyForecast.map((day) => (
                    <div
                      key={day.day}
                      className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <p className="w-16 font-medium">{day.day}</p>
                        <day.icon className="h-5 w-5" />
                        <p className="text-sm text-muted-foreground">{day.condition}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-primary">{day.high}°</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-muted-foreground">{day.low}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Outfit Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" />
                  기온별 옷차림 팁
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {outfitTips.map((tip) => (
                    <div key={tip.temp} className="flex items-center gap-3 rounded-lg bg-muted p-3">
                      <Badge variant="secondary">{tip.temp}</Badge>
                      <p className="text-sm">{tip.tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
