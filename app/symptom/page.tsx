"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Stethoscope, MapPin, ArrowRight, Loader2, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"

interface AnalysisResult {
  department: string
  description: string
  confidence: number
  additionalAdvice?: string
  possibleDepartments?: string[]
}

const commonSymptoms = [
  "두통이 있어요",
  "열이 나요",
  "기침이 나와요",
  "배가 아파요",
  "허리가 아파요",
  "피부에 발진이 생겼어요",
]

const departmentInfo: Record<string, string> = {
  "내과": "소화기, 호흡기, 심혈관 질환 등 내부 장기 관련 증상",
  "정형외과": "뼈, 관절, 근육 관련 증상",
  "피부과": "피부 질환, 알러지, 발진 등",
  "이비인후과": "귀, 코, 목 관련 증상",
  "안과": "눈 관련 증상",
  "신경과": "두통, 어지러움, 신경계 증상",
}

export default function SymptomPage() {
  const searchParams = useSearchParams()
  const [symptom, setSymptom] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  const hasAutoAnalyzed = useRef(false)

  // URL 쿼리 파라미터에서 증상 텍스트를 받아 자동 분석 실행
  useEffect(() => {
    const querySymptom = searchParams.get("q")
    if (querySymptom && !hasAutoAnalyzed.current) {
      hasAutoAnalyzed.current = true
      setSymptom(querySymptom)
      setTimeout(() => {
        runAnalysis(querySymptom)
      }, 300)
    }
  }, [searchParams])

  const runAnalysis = async (text: string) => {
    if (!text.trim()) return

    setIsAnalyzing(true)
    setResult(null)
    setError("")

    try {
      const response = await fetch("/api/symptom-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptom: text.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "분석 중 오류가 발생했습니다.")
        return
      }

      setResult(data)
    } catch (err) {
      setError("네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleAnalyze = () => {
    runAnalysis(symptom)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (symptom.trim() && !isAnalyzing) {
        handleAnalyze()
      }
    }
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
                  onChange={(e) => {
                    setSymptom(e.target.value)
                    if (error) setError("")
                  }}
                  onKeyDown={handleKeyDown}
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

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={!symptom.trim() || isAnalyzing}
                  className="w-full"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI 분석 중...
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
              <div className="space-y-4">
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
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>

                    {/* Additional advice */}
                    {result.additionalAdvice && (
                      <div className="flex gap-2 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/30">
                        <Info className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                        <p className="text-blue-700 dark:text-blue-300">{result.additionalAdvice}</p>
                      </div>
                    )}

                    {/* Alternative departments */}
                    {result.possibleDepartments && result.possibleDepartments.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm text-muted-foreground">이런 진료과도 고려해보세요:</p>
                        <div className="flex flex-wrap gap-2">
                          {result.possibleDepartments.map((dept) => (
                            <Badge key={dept} variant="secondary">
                              {dept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

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
              </div>
            )}

            {/* Department List - 결과 없을 때만 표시 */}
            {!result && !isAnalyzing && (
              <div className="mt-8">
                <h2 className="mb-4 text-lg font-semibold">진료과 안내</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(departmentInfo).map(([name, desc]) => (
                    <Card key={name} className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => setSymptom(`${name}에서 볼 수 있는 증상이 있어요`)}
                    >
                      <CardContent className="p-4">
                        <h3 className="font-medium">{name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
