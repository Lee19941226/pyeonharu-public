"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pill, Search, AlertTriangle, Clock, Ban, Info, Loader2, ArrowLeft, Package } from "lucide-react"
import Image from "next/image"

interface Medicine {
  id: string
  name: string
  company: string
  efficacy: string
  usage: string
  warningPrecaution: string
  precaution: string
  interaction: string
  sideEffect: string
  storage: string
  image: string
}

export default function MedicineTab() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    setError(null)
    setSelectedMedicine(null)

    try {
      const response = await fetch(`/api/medicine?itemName=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "검색 중 오류가 발생했습니다.")
        setSearchResults([])
        setTotalCount(0)
        return
      }

      setSearchResults(data.items || [])
      setTotalCount(data.totalCount || 0)
    } catch (err) {
      console.error("Search error:", err)
      setError("네트워크 오류가 발생했습니다.")
      setSearchResults([])
      setTotalCount(0)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  return (
    <div className="w-full">

      <div className="flex-1">
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
                      placeholder="약 이름을 입력하세요 (예: 타이레놀, 게보린)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "검색"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <Card className="mb-6 border-destructive">
                <CardContent className="flex items-center gap-2 p-4 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{error}</span>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {hasSearched && !selectedMedicine && !isSearching && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  검색 결과 {totalCount.toLocaleString()}건
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
                      role="button"
                      tabIndex={0}
                      aria-label={`${medicine.name} 상세 정보 보기`}
                      className="cursor-pointer transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setSelectedMedicine(medicine)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedMedicine(medicine); } }}
                    >
                      <CardContent className="min-h-[44px] p-4">
                        <div className="flex items-start gap-4">
                          {medicine.image ? (
                            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                              <Image
                                src={medicine.image}
                                alt={medicine.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                              <Package className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">{medicine.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {medicine.company}
                            </p>
                            {medicine.efficacy && (
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {medicine.efficacy}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Detail */}
            {selectedMedicine && (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedMedicine(null)}
                  className="mb-2"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  목록으로
                </Button>

                <Card>
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      {selectedMedicine.image ? (
                        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={selectedMedicine.image}
                            alt={selectedMedicine.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{selectedMedicine.name}</CardTitle>
                        <CardDescription>{selectedMedicine.company}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="efficacy">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="efficacy">
                          <Info className="mr-1 h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">효능</span>
                        </TabsTrigger>
                        <TabsTrigger value="usage">
                          <Clock className="mr-1 h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">용법</span>
                        </TabsTrigger>
                        <TabsTrigger value="precaution">
                          <AlertTriangle className="mr-1 h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">주의</span>
                        </TabsTrigger>
                        <TabsTrigger value="sideEffect">
                          <Ban className="mr-1 h-4 w-4 md:mr-2" />
                          <span className="hidden md:inline">부작용</span>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="efficacy" className="mt-4 space-y-4">
                        <div>
                          <h4 className="mb-2 font-medium">효능/효과</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {selectedMedicine.efficacy || "정보가 없습니다."}
                          </p>
                        </div>
                      </TabsContent>

                      <TabsContent value="usage" className="mt-4 space-y-4">
                        <div>
                          <h4 className="mb-2 font-medium">용법/용량</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {selectedMedicine.usage || "정보가 없습니다."}
                          </p>
                        </div>
                        {selectedMedicine.storage && (
                          <div>
                            <h4 className="mb-2 font-medium">보관법</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {selectedMedicine.storage}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="precaution" className="mt-4 space-y-4">
                        {selectedMedicine.warningPrecaution && (
                          <div className="rounded-lg bg-destructive/10 p-3">
                            <h4 className="mb-2 font-medium text-destructive">⚠️ 경고</h4>
                            <p className="text-sm text-destructive whitespace-pre-line">
                              {selectedMedicine.warningPrecaution}
                            </p>
                          </div>
                        )}
                        <div>
                          <h4 className="mb-2 font-medium">주의사항</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {selectedMedicine.precaution || "정보가 없습니다."}
                          </p>
                        </div>
                        {selectedMedicine.interaction && (
                          <div>
                            <h4 className="mb-2 font-medium">병용 주의 약물/음식</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {selectedMedicine.interaction}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="sideEffect" className="mt-4">
                        <div>
                          <h4 className="mb-2 font-medium">부작용</h4>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {selectedMedicine.sideEffect || "정보가 없습니다."}
                          </p>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <p className="mt-6 text-xs text-muted-foreground">
                      * 의약품 정보는 식품의약품안전처 제공 자료입니다.
                      <br />
                      * 정확한 복용법은 의사 또는 약사와 상담하세요.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Initial State */}
            {!hasSearched && (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <Pill className="mb-4 h-16 w-16 text-primary/30" />
                  <p className="text-center text-muted-foreground">
                    약 이름을 검색하면
                    <br />
                    상세 정보를 확인할 수 있어요
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}