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
        a: "네, 편하루의 모든 기본 기능은 무료로 이용하실 수 있습니다. 회원가입 없이도 병원/약국 검색, 증상 분석, 식품 알레르기 확인 등의 기능을 이용할 수 있어요.",
      },
      {
        q: "회원가입을 하면 어떤 기능을 더 이용할 수 있나요?",
        a: "로그인하시면 즐겨찾기 저장, 알레르기 프로필 관리, 식품 확인 기록 저장, 알림 설정 등의 개인화 기능을 이용하실 수 있습니다.",
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
    category: "식품 알레르기",
    questions: [
      {
        q: "식품 알레르기 정보는 어디서 가져오나요?",
        a: "식품의약품안전처 공공 API를 활용하여 바코드별 알레르기 성분, 원재료, 영양정보를 제공합니다.",
      },
      {
        q: "바코드가 인식되지 않으면 어떻게 하나요?",
        a: "바코드가 인식되지 않는 경우 제품명으로 직접 검색하실 수 있습니다. 사진 촬영 기능으로 라벨을 촬영해 AI 분석을 받을 수도 있어요.",
      },
      {
        q: "알레르기 프로필을 등록하면 뭐가 달라지나요?",
        a: "알레르기 프로필을 등록하면 식품 확인 시 내 알레르기와 자동 대조하여 위험 여부를 즉시 알려드립니다. 가족 구성원별 프로필도 관리할 수 있습니다.",
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
              <Card key={section.category}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {section.questions.map((faq, idx) => (
                      <AccordionItem key={idx} value={`${section.category}-${idx}`}>
                        <AccordionTrigger className="text-left text-sm font-medium">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Contact */}
          <div className="mx-auto mt-12 max-w-3xl text-center">
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <MessageCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
                <CardTitle className="mb-2 text-lg">원하는 답을 못 찾으셨나요?</CardTitle>
                <CardDescription>
                  아래 이메일로 문의해주시면 빠르게 답변 드리겠습니다.
                </CardDescription>
                <p className="mt-4 text-sm font-medium text-primary">
                  support@pyeonharu.com
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
      <MobileNav />
    </div>
  )
}
