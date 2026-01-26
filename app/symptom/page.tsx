"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Stethoscope, MapPin, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

const sampleDepartments = [
  { name: "내과", description: "소화기, 호흡기, 심혈관 질환 등 내부 장기 관련 증상" },
  { name: "정형외과", description: "뼈, 관절, 근육 관련 증상" },
  { name: "피부과", description: "피부 질환, 알러지, 발진 등" },
  { name: "이비인후과", description: "귀, 코, 목 관련 증상" },
  { name: "안과", description: "눈 관련 증상" },
  { name: "신경과", description: "두통, 어지러움, 신경계 증상" },
]

const commonSymptoms = [
  "두통이 있어요",
  "열이 나요",
  "기침이 나와요",
  "배가 아파요",
  "허리가 아파요",
  "피부에 발진이 생겼어요",
]

export default function SymptomPage() {
  const [symptom, setSymptom] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<{
    department: string
    description: string
    confidence: number
  } | null>(null)

  const handleAnalyze = async () => {
    if (!symptom.trim()) return

    setIsAnalyzing(true)
    setResult(null)

    // 시뮬레이션 (실제로는 AI API 호출)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // 샘플 결과
    const randomDept = sampleDepartments[Math.floor(Math.random() * sampleDepartments.length)]
    setResult({
      department: randomDept.name,
      description: randomDept.description,
      confidence: 75 + Math.floor(Math.random() * 20),
    })

    setIsAnalyzing(false)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">증상으로 진료과 추천</h1>
            <p className="mt-2 text-muted-foreground">
              증상을 입력하면 AI가 적합한 진료과를 추천해드립니다
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            {/* Input Area */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">증상을 알려주세요</CardTitle>
                <CardDescription>
                  현재 겪고 있는 증상을 자세히 설명해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="예: 머리가 아프고 열이 나요. 목도 좀 칼칼한 것 같아요."
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  rows={4}
                  className="resize-none"
                />

                {/* Quick symptoms */}
                <div>
                  <p className="mb-2 text-sm text-muted-foreground">빠른 입력:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonSymptoms.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => setSymptom(s)}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!symptom.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI 분석하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Result */}
            {result && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI 추천 결과
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/10 p-4">
                    <p className="mb-1 text-sm text-muted-foreground">추천 진료과</p>
                    <p className="text-2xl font-bold text-primary">{result.department}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{result.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">AI 신뢰도</span>
                    <span className="font-medium">{result.confidence}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    * AI 추천은 참고용이며, 정확한 진단은 의료 전문가와 상담하세요.
                  </p>

                  <Button asChild className="w-full">
                    <Link href={`/search?department=${encodeURIComponent(result.department)}`}>
                      <MapPin className="mr-2 h-4 w-4" />
                      주변 {result.department} 검색하기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Department List */}
            <div className="mt-8">
              <h2 className="mb-4 text-lg font-semibold">진료과 안내</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {sampleDepartments.map((dept) => (
                  <Card key={dept.name} className="cursor-pointer transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <h3 className="font-medium">{dept.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{dept.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
