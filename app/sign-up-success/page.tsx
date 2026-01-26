import Link from "next/link"
import { Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <span className="text-xl font-bold text-primary-foreground">편</span>
        </div>
        <span className="text-2xl font-bold">편하루</span>
      </Link>

      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">이메일을 확인해주세요</CardTitle>
          <CardDescription className="text-base">
            입력하신 이메일로 인증 링크를 보내드렸습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            메일함에서 편하루 인증 메일을 확인하고,<br />
            링크를 클릭하면 가입이 완료됩니다.
          </p>
          <p className="text-xs text-muted-foreground">
            메일이 도착하지 않았다면 스팸함을 확인해주세요.
          </p>

          <div className="pt-4">
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/login">
                로그인 페이지로
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
