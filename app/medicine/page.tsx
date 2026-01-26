"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pill, Search, AlertTriangle, Clock, Ban, Info } from "lucide-react"

interface Medicine {
  id: string
  name: string
  englishName: string
  company: string
  category: string
  usage: string
  dosage: string
  precautions: string[]
  sideEffects: string[]
  interactions: string[]
}

const sampleMedicines: Medicine[] = [
  {
    id: "1",
    name: "타이레놀정 500mg",
    englishName: "Tylenol 500mg",
    company: "한국얀센",
    category: "해열진통제",
    usage: "두통, 치통, 생리통, 근육통, 관절통, 감기로 인한 발열 및 동통",
    dosage: "성인 1회 1~2정, 1일 3~4회 복용 (4~6시간 간격). 1일 최대 8정 이하.",
    precautions: [
      "간 질환 환자 주의",
      "알코올 섭취 시 복용 금지",
      "다른 해열진통제와 병용 주의",
    ],
    sideEffects: ["메스꺼움", "구토", "식욕부진", "드물게 알러지 반응"],
    interactions: ["와파린", "항응고제", "알코올"],
  },
  {
    id: "2",
    name: "판피린티정",
    englishName: "Panpyrin T",
    company: "동아제약",
    category: "종합감기약",
    usage: "감기의 제증상(콧물, 코막힘, 재채기, 인후통, 기침, 발열, 두통, 관절통, 근육통) 완화",
    dosage: "성인 1회 1정, 1일 3회 식후 복용",
    precautions: [
      "졸음이 올 수 있어 운전 자제",
      "녹내장 환자 주의",
      "전립선 비대증 환자 주의",
    ],
    sideEffects: ["졸음", "구갈", "변비", "배뇨곤란"],
    interactions: ["수면제", "진정제", "MAO 억제제"],
  },
]

const recentSearches = ["타이레놀", "판피린", "이지엔6", "아스피린", "게보린"]

export default function MedicinePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = () => {
    if (!searchQuery.trim()) return

    setHasSearched(true)
    const results = sampleMedicines.filter(
      (m) =>
        m.name.includes(searchQuery) ||
        m.englishName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setSearchResults(results)
    setSelectedMedicine(null)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Pill className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">약 정보 검색</h1>
            <p className="mt-2 text-muted-foreground">
              약 이름으로 복용법, 주의사항, 부작용 정보를 확인하세요
            </p>
          </div>

          <div className="mx-auto max-w-2xl">
            {/* Search */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="약 이름을 입력하세요"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch}>검색</Button>
                </div>

                {/* Recent searches */}
                {!hasSearched && (
                  <div className="mt-4">
                    <p className="mb-2 text-sm text-muted-foreground">최근 검색:</p>
                    <div className="flex flex-wrap gap-2">
                      {recentSearches.map((term) => (
                        <Badge
                          key={term}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => {
                            setSearchQuery(term)
                            setHasSearched(true)
                            const results = sampleMedicines.filter(
                              (m) =>
                                m.name.includes(term) ||
                                m.englishName.toLowerCase().includes(term.toLowerCase())
                            )
                            setSearchResults(results)
                          }}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results */}
            {hasSearched && !selectedMedicine && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  검색 결과 {searchResults.length}건
                </p>
                {searchResults.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center py-8">
                      <Pill className="mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-center text-muted-foreground">
                        검색 결과가 없습니다.
                        <br />
                        다른 이름으로 검색해보세요.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  searchResults.map((medicine) => (
                    <Card
                      key={medicine.id}
                      className="cursor-pointer transition-all hover:shadow-md"
                      onClick={() => setSelectedMedicine(medicine)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{medicine.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {medicine.englishName}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {medicine.company} | {medicine.category}
                            </p>
                          </div>
                          <Badge>{medicine.category}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Detail */}
            {selectedMedicine && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedMedicine.name}</CardTitle>
                      <CardDescription>
                        {selectedMedicine.englishName} | {selectedMedicine.company}
                      </CardDescription>
                    </div>
                    <Badge>{selectedMedicine.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="usage">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="usage">
                        <Info className="mr-1 h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">용법</span>
                      </TabsTrigger>
                      <TabsTrigger value="precautions">
                        <AlertTriangle className="mr-1 h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">주의</span>
                      </TabsTrigger>
                      <TabsTrigger value="sideEffects">
                        <Clock className="mr-1 h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">부작용</span>
                      </TabsTrigger>
                      <TabsTrigger value="interactions">
                        <Ban className="mr-1 h-4 w-4 md:mr-2" />
                        <span className="hidden md:inline">병용금지</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="usage" className="mt-4 space-y-4">
                      <div>
                        <h4 className="mb-2 font-medium">효능/효과</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedMedicine.usage}
                        </p>
                      </div>
                      <div>
                        <h4 className="mb-2 font-medium">용법/용량</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedMedicine.dosage}
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="precautions" className="mt-4">
                      <ul className="space-y-2">
                        {selectedMedicine.precautions.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </TabsContent>

                    <TabsContent value="sideEffects" className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedMedicine.sideEffects.map((effect) => (
                          <Badge key={effect} variant="secondary">
                            {effect}
                          </Badge>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="interactions" className="mt-4">
                      <p className="mb-2 text-sm text-muted-foreground">
                        다음 약물/성분과 함께 복용 시 주의가 필요합니다:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMedicine.interactions.map((drug) => (
                          <Badge key={drug} variant="destructive">
                            {drug}
                          </Badge>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6">
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => setSelectedMedicine(null)}
                    >
                      목록으로 돌아가기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
