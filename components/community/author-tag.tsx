"use client"

interface AuthorTagProps {
  enrollmentStatus: "enrolled" | "graduated" | null
  graduationYear?: number | null
  myEnrollment?: {
    enrollment_status: string | null
    graduation_year: number | null
  } | null
  isOwner?: boolean
}

function getRelationTag(
  authorStatus: string | null,
  authorGradYear: number | null,
  myStatus: string | null,
  myGradYear: number | null,
): { label: string; className: string } | null {
  if (!authorStatus || !myStatus) return null

  // 둘 다 재학 → 관계 태그 없음
  if (authorStatus === "enrolled" && myStatus === "enrolled") return null

  // 한쪽 재학 + 한쪽 졸업 → 졸업생이 "선배"
  if (authorStatus === "graduated" && myStatus === "enrolled") {
    return { label: "선배", className: "bg-purple-100 text-purple-700" }
  }
  if (authorStatus === "enrolled" && myStatus === "graduated") {
    return { label: "후배", className: "bg-amber-100 text-amber-700" }
  }

  // 둘 다 졸업 → 졸업년도 비교 (둘 다 설정된 경우에만)
  if (authorStatus === "graduated" && myStatus === "graduated") {
    if (!authorGradYear || !myGradYear) return null

    if (authorGradYear === myGradYear) {
      return { label: "동창", className: "bg-pink-100 text-pink-700" }
    }
    if (authorGradYear < myGradYear) {
      return { label: "선배", className: "bg-purple-100 text-purple-700" }
    }
    return { label: "후배", className: "bg-amber-100 text-amber-700" }
  }

  return null
}

export function AuthorTag({ enrollmentStatus, graduationYear, myEnrollment, isOwner }: AuthorTagProps) {
  if (!enrollmentStatus) return null

  const statusTag = enrollmentStatus === "enrolled" ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
      재학생
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
      졸업생{graduationYear ? ` ('${String(graduationYear).slice(2)})` : ""}
    </span>
  )

  // 본인 글이면 관계 태그 불필요
  const relation = !isOwner && myEnrollment
    ? getRelationTag(
        enrollmentStatus,
        graduationYear ?? null,
        myEnrollment.enrollment_status,
        myEnrollment.graduation_year,
      )
    : null

  return (
    <>
      {statusTag}
      {relation && (
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${relation.className}`}>
          {relation.label}
        </span>
      )}
    </>
  )
}
