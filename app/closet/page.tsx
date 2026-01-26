"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { MobileNav } from "@/components/layout/mobile-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Shirt, Plus, Trash2, ImagePlus } from "lucide-react"

interface ClothingItem {
  id: string
  name: string
  category: "top" | "bottom" | "outer" | "shoes"
  color: string
  season: string[]
  imageUrl?: string
}

const categories = [
  { value: "top", label: "상의" },
  { value: "bottom", label: "하의" },
  { value: "outer", label: "아우터" },
  { value: "shoes", label: "신발" },
]

const colors = [
  { value: "white", label: "화이트", class: "bg-white border" },
  { value: "black", label: "블랙", class: "bg-gray-900" },
  { value: "gray", label: "그레이", class: "bg-gray-400" },
  { value: "navy", label: "네이비", class: "bg-blue-900" },
  { value: "beige", label: "베이지", class: "bg-amber-100" },
  { value: "brown", label: "브라운", class: "bg-amber-700" },
  { value: "blue", label: "블루", class: "bg-blue-500" },
  { value: "red", label: "레드", class: "bg-red-500" },
  { value: "green", label: "그린", class: "bg-green-500" },
  { value: "pink", label: "핑크", class: "bg-pink-400" },
]

const seasons = [
  { value: "spring", label: "봄" },
  { value: "summer", label: "여름" },
  { value: "fall", label: "가을" },
  { value: "winter", label: "겨울" },
]

// 샘플 데이터
const sampleClothes: ClothingItem[] = [
  { id: "1", name: "흰색 셔츠", category: "top", color: "white", season: ["spring", "summer", "fall"] },
  { id: "2", name: "검정 맨투맨", category: "top", color: "black", season: ["spring", "fall", "winter"] },
  { id: "3", name: "네이비 니트", category: "top", color: "navy", season: ["fall", "winter"] },
  { id: "4", name: "청바지", category: "bottom", color: "blue", season: ["spring", "summer", "fall", "winter"] },
  { id: "5", name: "베이지 슬랙스", category: "bottom", color: "beige", season: ["spring", "summer", "fall"] },
  { id: "6", name: "검정 코트", category: "outer", color: "black", season: ["fall", "winter"] },
  { id: "7", name: "흰색 스니커즈", category: "shoes", color: "white", season: ["spring", "summer", "fall"] },
]

export default function ClosetPage() {
  const [clothes, setClothes] = useState<ClothingItem[]>(sampleClothes)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    color: "",
    season: [] as string[],
  })

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || !newItem.color || newItem.season.length === 0) {
      return
    }

    const item: ClothingItem = {
      id: Date.now().toString(),
      name: newItem.name,
      category: newItem.category as ClothingItem["category"],
      color: newItem.color,
      season: newItem.season,
    }

    setClothes([...clothes, item])
    setNewItem({ name: "", category: "", color: "", season: [] })
    setIsDialogOpen(false)
  }

  const handleDeleteItem = (id: string) => {
    setClothes(clothes.filter((c) => c.id !== id))
  }

  const toggleSeason = (season: string) => {
    setNewItem((prev) => ({
      ...prev,
      season: prev.season.includes(season)
        ? prev.season.filter((s) => s !== season)
        : [...prev.season, season],
    }))
  }

  const getColorClass = (colorValue: string) => {
    return colors.find((c) => c.value === colorValue)?.class || "bg-gray-200"
  }

  const getColorLabel = (colorValue: string) => {
    return colors.find((c) => c.value === colorValue)?.label || colorValue
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">내 옷장</h1>
              <p className="mt-1 text-muted-foreground">
                옷을 등록하면 더 정확한 코디를 추천받을 수 있어요
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  옷 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 옷 등록</DialogTitle>
                  <DialogDescription>
                    옷장에 새로운 옷을 추가하세요
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Image upload placeholder */}
                  <div className="flex justify-center">
                    <div className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50">
                      <ImagePlus className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">사진 추가</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      placeholder="예: 흰색 면 셔츠"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>카테고리</Label>
                    <Select
                      value={newItem.category}
                      onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>색상</Label>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`h-8 w-8 rounded-full ${color.class} ${
                            newItem.color === color.value
                              ? "ring-2 ring-primary ring-offset-2"
                              : ""
                          }`}
                          onClick={() => setNewItem({ ...newItem, color: color.value })}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>계절</Label>
                    <div className="flex flex-wrap gap-2">
                      {seasons.map((season) => (
                        <Badge
                          key={season.value}
                          variant={newItem.season.includes(season.value) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleSeason(season.value)}
                        >
                          {season.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleAddItem} className="w-full">
                    등록하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">전체 ({clothes.length})</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat.value} value={cat.value}>
                  {cat.label} ({clothes.filter((c) => c.category === cat.value).length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <ClothesGrid
                clothes={clothes}
                onDelete={handleDeleteItem}
                getColorClass={getColorClass}
                getColorLabel={getColorLabel}
              />
            </TabsContent>

            {categories.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="mt-6">
                <ClothesGrid
                  clothes={clothes.filter((c) => c.category === cat.value)}
                  onDelete={handleDeleteItem}
                  getColorClass={getColorClass}
                  getColorLabel={getColorLabel}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}

function ClothesGrid({
  clothes,
  onDelete,
  getColorClass,
  getColorLabel,
}: {
  clothes: ClothingItem[]
  onDelete: (id: string) => void
  getColorClass: (color: string) => string
  getColorLabel: (color: string) => string
}) {
  if (clothes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shirt className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">등록된 옷이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {clothes.map((item) => (
        <Card key={item.id} className="group relative overflow-hidden">
          <CardContent className="p-4">
            <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-muted">
              <Shirt className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{item.name}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <div className={`h-4 w-4 rounded-full ${getColorClass(item.color)}`} />
                  <span className="text-xs text-muted-foreground">{getColorLabel(item.color)}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {item.season.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {seasons.find((se) => se.value === s)?.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
