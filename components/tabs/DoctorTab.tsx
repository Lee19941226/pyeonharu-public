"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Star,
  Loader2,
  UserRound,
} from "lucide-react";

const QUICK_DEPARTMENTS = [
  "내과",
  "외과",
  "소아청소년과",
  "산부인과",
  "정형외과",
  "피부과",
  "이비인후과",
  "안과",
  "비뇨의학과",
  "정신건강의학과",
];

interface DoctorSummary {
  doctorName: string;
  hospitalName: string;
  department: string;
  avgRating: number;
  reviewCount: number;
  diseases: string[];
}

export default function DoctorTab() {
  const [query, setQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDoctors = useCallback(async (q: string, dept: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (dept) params.set("department", dept);
      params.set("limit", "30");

      const res = await fetch(`/api/doctor-reviews?${params.toString()}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch {
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchDoctors("", "");
  }, [fetchDoctors]);

  // 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors(query, selectedDept);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, selectedDept, fetchDoctors]);

  const handleDeptToggle = (dept: string) => {
    setSelectedDept((prev) => (prev === dept ? "" : dept));
  };

  return (
    <div className="container mx-auto px-4 pt-3">
      <div className="mx-auto max-w-2xl">
        {/* 검색 */}
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="의사명, 병명, 병원명으로 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            병원 상세 페이지에서 의사 리뷰를 남기면 여기에 모여요
          </p>
        </div>

        {/* 진료과 필터 */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {QUICK_DEPARTMENTS.map((dept) => (
            <Badge
              key={dept}
              variant={selectedDept === dept ? "default" : "outline"}
              className="cursor-pointer transition-colors"
              onClick={() => handleDeptToggle(dept)}
            >
              {dept}
            </Badge>
          ))}
        </div>

        {/* 결과 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center">
            <UserRound className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {hasSearched && query
                ? "검색 결과가 없습니다"
                : "아직 의사 리뷰가 없습니다"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              병원 상세 페이지에서 진료받은 의사 리뷰를 남겨보세요
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {doctors.map((doctor, idx) => (
              <Card key={`${doctor.doctorName}-${doctor.hospitalName}-${idx}`}>
                <CardContent className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground shrink-0" />
                    <h3 className="text-sm font-semibold truncate">{doctor.doctorName}</h3>
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5 py-0">{doctor.department}</Badge>
                    <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{doctor.hospitalName}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold shrink-0">{doctor.avgRating}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">({doctor.reviewCount})</span>
                  </div>
                  {doctor.diseases.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 pl-6">
                      {doctor.diseases.map((d) => (
                        <Badge key={d} variant="outline" className="text-[10px] px-1.5 py-0">{d}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
