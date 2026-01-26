"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Shirt } from "lucide-react"

interface OutfitRecord {
  id: string
  date: string
  weather: { temp: number; condition: string }
  outfit: {
    top: string
    bottom: string
    outer?: string
    shoes: string
  }
  rating?: "good" | "bad"
}

const sampleRecords: OutfitRecord[] = [
  {
    id: "1",
    date: "2026-01-26",
    weather: { temp: 8, condition: "구름 많음" },
    outfit: {
      top: "검정 맨투맨",
      bottom: "청바지",
      outer: "검정 코트",
      shoes: "흰색 스니커즈",
    },
    rating: "good",
  },
  {
    id: "2",
    date: "2026-01-25",
    weather: { temp: 5, condition: "맑음" },
    outfit: {
      top: "네이비 니트",
      bottom: "베이지 슬랙스",
      outer: "검정 코트",
      shoes: "로퍼",
    },
    rating: "good",
  },
  {
    id: "3",
    date: "2026-01-24",
    weather: { temp: 3, condition: "흐림" },
    outfit: {
      top: "흰색 셔츠",
      bottom: "청바지",
      shoes: "흰색 스니커즈",
    },
    rating: "bad",
  },
]

export default function HistoryPage() {
  const [records, setRecords] = useState<OutfitRecord[]>(sampleRecords)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  const getDayOfWeek = (dateStr: string) => {
    const days = ["일", "월", "화", "수", "목", "금", "토"]
    return days[new Date(dateStr).getDay()]
  }

  const handleRate = (id: string, rating: "good" | "bad") => {
    setRecords(records.map((r) => (r.id === id ? { ...r, rating } : r)))
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold md:text-3xl">코디 기록</h1>
              <p className="mt-1 text-muted-foreground">
                날짜별로 입었던 옷을 확인하고 평가하세요
              </p>
            </div>

            {/* Month Selector */}
            <Card className="mb-6">
              <CardContent className="flex items-center justify-between p-4">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-medium">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </CardContent>
            </Card>

            {/* Records */}
            {records.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Shirt className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">이 달의 코디 기록이 없습니다</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {records.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {formatDate(record.date)} ({getDayOfWeek(record.date)})
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.weather.temp}° {record.weather.condition}
                          </p>
                        </div>
                        {record.rating && (
                          <Badge variant={record.rating === "good" ? "default" : "secondary"}>
                            {record.rating === "good" ? "좋았어요" : "별로였어요"}
                          </Badge>
                        )}
                      </div>

                      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded bg-muted p-2">
                          <span className="text-muted-foreground">상의: </span>
                          {record.outfit.top}
                        </div>
                        <div className="rounded bg-muted p-2">
                          <span className="text-muted-foreground">하의: </span>
                          {record.outfit.bottom}
                        </div>
                        {record.outfit.outer && (
                          <div className="rounded bg-muted p-2">
                            <span className="text-muted-foreground">아우터: </span>
                            {record.outfit.outer}
                          </div>
                        )}
                        <div className="rounded bg-muted p-2">
                          <span className="text-muted-foreground">신발: </span>
                          {record.outfit.shoes}
                        </div>
                      </div>

                      {!record.rating && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => handleRate(record.id, "good")}
                          >
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            좋았어요
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 bg-transparent"
                            onClick={() => handleRate(record.id, "bad")}
                          >
                            <ThumbsDown className="mr-2 h-4 w-4" />
                            별로였어요
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
