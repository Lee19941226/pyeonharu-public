"use client"

import { useState } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Cross,
  MapPin,
  Phone,
  Clock,
  Trash2,
  Heart,
  ExternalLink,
} from "lucide-react"

interface BookmarkedPlace {
  id: string
  name: string
  type: "hospital" | "pharmacy"
  address: string
  phone: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

const sampleHospitals: BookmarkedPlace[] = [
  {
    id: "1",
    name: "서울대학교병원",
    type: "hospital",
    address: "서울특별시 종로구 대학로 101",
    phone: "02-2072-2114",
    isOpen: true,
    openTime: "08:30",
    closeTime: "17:30",
  },
  {
    id: "2",
    name: "연세세브란스병원",
    type: "hospital",
    address: "서울특별시 서대문구 연세로 50-1",
    phone: "02-2228-1114",
    isOpen: true,
    openTime: "08:00",
    closeTime: "18:00",
  },
]

const samplePharmacies: BookmarkedPlace[] = [
  {
    id: "3",
    name: "온누리약국",
    type: "pharmacy",
    address: "서울특별시 종로구 대학로 85",
    phone: "02-745-1234",
    isOpen: true,
    openTime: "09:00",
    closeTime: "21:00",
  },
]

export default function BookmarksPage() {
  const [hospitals, setHospitals] = useState<BookmarkedPlace[]>(sampleHospitals)
  const [pharmacies, setPharmacies] = useState<BookmarkedPlace[]>(samplePharmacies)

  const handleRemove = (id: string, type: "hospital" | "pharmacy") => {
    if (type === "hospital") {
      setHospitals(hospitals.filter((h) => h.id !== id))
    } else {
      setPharmacies(pharmacies.filter((p) => p.id !== id))
    }
  }

  const PlaceCard = ({ place }: { place: BookmarkedPlace }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              {place.type === "hospital" ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Cross className="h-4 w-4" />
                </div>
              )}
              <div>
                <h3 className="font-semibold">{place.name}</h3>
              </div>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {place.address}
              </p>
              <p className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {place.phone}
              </p>
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {place.openTime} - {place.closeTime}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge variant={place.isOpen ? "default" : "secondary"}>
              {place.isOpen ? "영업중" : "영업종료"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleRemove(place.id, place.type)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">즐겨찾기 삭제</span>
            </Button>
          </div>
        </div>

        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
            <Link href={`/${place.type}/${place.id}`}>
              상세정보
              <ExternalLink className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
            <a href={`tel:${place.phone}`}>
              <Phone className="mr-1 h-3 w-3" />
              전화
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const EmptyState = ({ type }: { type: string }) => (
    <div className="flex flex-col items-center py-12 text-center">
      <Heart className="mb-4 h-12 w-12 text-muted-foreground" />
      <p className="mb-2 font-medium">즐겨찾기한 {type}이 없습니다</p>
      <p className="mb-4 text-sm text-muted-foreground">
        {type} 검색 후 하트 버튼을 눌러 즐겨찾기에 추가하세요
      </p>
      <Button asChild>
        <Link href="/search">검색하러 가기</Link>
      </Button>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold md:text-3xl">즐겨찾기</h1>
              <p className="mt-1 text-muted-foreground">
                자주 찾는 병원과 약국을 모아보세요
              </p>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="hospitals">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="hospitals">
                  <Building2 className="mr-2 h-4 w-4" />
                  병원 ({hospitals.length})
                </TabsTrigger>
                <TabsTrigger value="pharmacies">
                  <Cross className="mr-2 h-4 w-4" />
                  약국 ({pharmacies.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hospitals" className="mt-6">
                {hospitals.length === 0 ? (
                  <EmptyState type="병원" />
                ) : (
                  <div className="space-y-4">
                    {hospitals.map((hospital) => (
                      <PlaceCard key={hospital.id} place={hospital} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pharmacies" className="mt-6">
                {pharmacies.length === 0 ? (
                  <EmptyState type="약국" />
                ) : (
                  <div className="space-y-4">
                    {pharmacies.map((pharmacy) => (
                      <PlaceCard key={pharmacy.id} place={pharmacy} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
