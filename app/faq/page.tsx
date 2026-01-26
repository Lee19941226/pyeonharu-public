import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { MobileNav } from "@/components/layout/mobile-nav"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HelpCircle, MessageCircle } from "lucide-react"

const faqs = [
  {
    category: "서비스 일반",
    questions: [
      {
        q: "편하루는 무료인가요?",
        a: "네, 편하루의 모든 기본 기능은 무료로 이용하실 수 있습니다. 회원가입 없이도 병원/약국 검색, 증상 분석, 코디 추천 등의 기능을 이용할 수 있어요.",
      },
      {
        q: "회원가입을 하면 어떤 기능을 더 이용할 수 있나요?",
        a: "로그인하시면 즐겨찾기 저장, 내 옷장 관리, 코디 기록 저장, 알림 설정 등의 개인화 기능을 이용하실 수 있습니다.",
      },
      {
        q: "개인정보는 어떻게 보호되나요?",
        a: "편하루는 사용자의 개인정보를 안전하게 보호합니다. 위치 정보는 검색 시에만 사용되며 저장되지 않습니다. 자세한 내용은 개인정보처리방침을 확인해주세요.",
      },
    ],
  },
  {
    category: "병원/약국 검색",
    questions: [
      {
        q: "병원/약국 정보는 어디서 가져오나요?",
        a: "건강보험심사평가원과 공공데이터포털의 공식 데이터를 활용하여 정확한 정보를 제공합니다. 영업시간 등의 정보는 실제와 다를 수 있으니 방문 전 전화 확인을 권장드립니다.",
      },
      {
        q: "AI 증상 분석은 정확한가요?",
        a: "AI 증상 분석은 참고용으로만 사용해주세요. 정확한 진단은 반드시 의료 전문가와 상담하시기 바랍니다. 응급 상황 시에는 119에 연락하거나 가까운 응급실을 방문해주세요.",
      },
      {
        q: "위치 정보를 허용하지 않으면 이용할 수 없나요?",
        a: "위치 정보 없이도 지역을 직접 검색하여 병원/약국을 찾으실 수 있습니다. 다만, 현재 위치 기반 검색을 위해서는 위치 정보 허용이 필요합니다.",
      },
    ],
  },
  {
    category: "옷차림 추천",
    questions: [
      {
        q: "날씨 정보는 어디서 가져오나요?",
        a: "기상청 공공 API를 활용하여 실시간 날씨 정보를 제공합니다. 현재 위치 기반으로 가장 가까운 관측소의 데이터를 사용합니다.",
      },
      {
        q: "내 옷장에 등록한 옷이 코디 추천에 반영되나요?",
        a: "네, 옷장에 등록된 옷을 바탕으로 더 개인화된 코디를 추천해드립니다. 색상, 계절 태그 등을 잘 입력하시면 더 정확한 추천을 받으실 수 있어요.",
      },
      {
        q: "옷 사진을 올리면 자동으로 분류되나요?",
        a: "현재는 수동으로 카테고리와 색상을 선택하셔야 합니다. AI 자동 분류 기능은 추후 업데이트 예정입니다.",
      },
    ],
  },
  {
    category: "계정 관련",
    questions: [
      {
        q: "비밀번호를 잊어버렸어요.",
        a: "로그인 페이지에서 '비밀번호를 잊으셨나요?' 링크를 클릭하시면 이메일로 비밀번호 재설정 링크를 받으실 수 있습니다.",
      },
      {
        q: "회원 탈퇴는 어떻게 하나요?",
        a: "마이페이지 > 계정 관리에서 회원 탈퇴를 진행하실 수 있습니다. 탈퇴 시 모든 데이터가 삭제되며 복구가 불가능합니다.",
      },
    ],
  },
]

export default function FAQPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">자주 묻는 질문</h1>
            <p className="mt-2 text-muted-foreground">
              궁금한 점이 있으신가요? 아래에서 답을 찾아보세요.
            </p>
          </div>

          {/* FAQ List */}
          <div className="mx-auto max-w-3xl space-y-8">
            {faqs.map((section) => (
              <div key={section.category}>
                <h2 className="mb-4 text-lg font-semibold">{section.category}</h2>
                <Accordion type="single" collapsible className="w-full">
                  {section.questions.map((faq, index) => (
                    <AccordionItem key={index} value={`${section.category}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>

          {/* Contact */}
          <Card className="mx-auto mt-12 max-w-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>원하는 답을 찾지 못하셨나요?</CardTitle>
              <CardDescription>
                편하루 팀에 직접 문의해주세요
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="font-medium text-primary">contact@pyeonharu.com</p>
              <p className="mt-2 text-sm text-muted-foreground">
                평일 09:00 - 18:00 (주말/공휴일 제외)
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
