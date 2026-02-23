"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="뒤로가기"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">개인정보처리방침</h1>
      </div>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6 text-gray-700 text-sm leading-relaxed">
          <p className="text-xs text-gray-400">시행일: 2025년 2월 24일</p>

          <p>
            편하루(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요시하며,
            「개인정보 보호법」 등 관련 법령을 준수합니다. 본 개인정보처리방침을
            통해 이용자의 개인정보가 어떻게 수집, 이용, 관리되는지 안내드립니다.
          </p>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              1. 수집하는 개인정보 항목
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">구분</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">수집 항목</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">수집 목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">회원가입</td>
                    <td className="border border-gray-200 px-3 py-2">이메일, 닉네임, 프로필 이미지(선택)</td>
                    <td className="border border-gray-200 px-3 py-2">회원 식별 및 서비스 제공</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 font-medium">소셜 로그인</td>
                    <td className="border border-gray-200 px-3 py-2">소셜 계정 고유 ID, 이메일, 프로필 정보</td>
                    <td className="border border-gray-200 px-3 py-2">간편 로그인 및 회원 식별</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">알레르기 관리</td>
                    <td className="border border-gray-200 px-3 py-2">알레르기 정보, 식이 제한 사항</td>
                    <td className="border border-gray-200 px-3 py-2">맞춤형 알레르기 알림 제공</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 font-medium">식품 분석</td>
                    <td className="border border-gray-200 px-3 py-2">촬영 이미지, 바코드 정보</td>
                    <td className="border border-gray-200 px-3 py-2">AI 기반 식품 분석 서비스 제공</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">증상 분석</td>
                    <td className="border border-gray-200 px-3 py-2">증상 정보, 증상 부위 이미지(선택)</td>
                    <td className="border border-gray-200 px-3 py-2">AI 증상 분석 및 병원 안내</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 font-medium">위치 정보</td>
                    <td className="border border-gray-200 px-3 py-2">현재 위치(GPS)</td>
                    <td className="border border-gray-200 px-3 py-2">주변 병원/약국/식당 검색</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2 font-medium">자동 수집</td>
                    <td className="border border-gray-200 px-3 py-2">접속 로그, 기기 정보, 브라우저 정보</td>
                    <td className="border border-gray-200 px-3 py-2">서비스 개선 및 오류 분석</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              2. 개인정보의 이용 목적
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>회원 관리: 회원 식별, 가입 및 탈퇴 처리, 부정 이용 방지</li>
              <li>서비스 제공: 알레르기 관리, 식품 분석, 증상 분석, 위치 기반 서비스</li>
              <li>서비스 개선: 이용 통계 분석, 서비스 품질 향상</li>
              <li>안내 및 공지: 서비스 관련 공지사항 전달</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p>
              이용자의 개인정보는 서비스 이용 기간 동안 보유하며, 회원 탈퇴 시
              지체 없이 파기합니다. 단, 관련 법령에 의해 보존이 필요한 경우 해당
              기간 동안 보관합니다.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>전자상거래 등에서의 소비자보호에 관한 법률: 계약 또는 청약철회 기록 5년</li>
              <li>통신비밀보호법: 접속 로그 기록 3개월</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              다만, 다음의 경우에는 예외로 합니다.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 의해 요구되는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              5. 개인정보 처리 위탁
            </h2>
            <p>서비스는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">수탁업체</th>
                    <th className="border border-gray-200 px-3 py-2 text-left font-semibold">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">Supabase Inc.</td>
                    <td className="border border-gray-200 px-3 py-2">데이터베이스 호스팅, 인증 서비스</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2">Vercel Inc.</td>
                    <td className="border border-gray-200 px-3 py-2">웹 서비스 호스팅</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-3 py-2">OpenAI</td>
                    <td className="border border-gray-200 px-3 py-2">AI 기반 식품/증상 분석</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2">네이버 클라우드</td>
                    <td className="border border-gray-200 px-3 py-2">소셜 로그인, 지도/검색 API</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              6. 개인정보의 파기 절차 및 방법
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>파기 절차: 보유 기간 만료 또는 처리 목적 달성 시 지체 없이 파기</li>
              <li>파기 방법: 전자적 파일은 복구 불가능한 방법으로 삭제, 종이 문서는 분쇄 또는 소각</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              7. 이용자의 권리와 행사 방법
            </h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정 및 삭제 요구</li>
              <li>개인정보 처리 정지 요구</li>
              <li>회원 탈퇴 (서비스 내 설정에서 직접 처리 가능)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              8. 개인정보 보호를 위한 안전조치
            </h2>
            <p>서비스는 이용자의 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>데이터 암호화: SSL/TLS를 통한 데이터 전송 암호화</li>
              <li>접근 제어: Row Level Security(RLS) 기반 데이터 접근 제어</li>
              <li>인증 보안: OAuth 2.0 기반 안전한 인증 체계</li>
              <li>API 보안: 서버사이드 API 키 관리 및 접근 제한</li>
              <li>정기 점검: 보안 취약점 점검 및 업데이트</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              9. 쿠키(Cookie) 사용
            </h2>
            <p>
              서비스는 이용자의 인증 상태 유지를 위해 쿠키를 사용합니다.
              이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나,
              이 경우 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              10. 개인정보 보호책임자
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="font-semibold text-blue-900">개인정보 보호책임자</p>
              <ul className="mt-2 space-y-1 text-blue-800">
                <li>팀명: 편하루 개발팀</li>
                <li>이메일: pyeonharu@gmail.com</li>
              </ul>
              <p className="mt-3 text-xs text-blue-600">
                개인정보 관련 문의사항은 위 이메일로 연락 주시면 신속하게 답변드리겠습니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              11. 개인정보 침해 구제
            </h2>
            <p>개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
              <li>개인정보분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
              <li>대검찰청 사이버수사과 (www.spo.go.kr / 1301)</li>
              <li>경찰청 사이버수사국 (ecrm.police.go.kr / 182)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">
              12. 방침 변경에 관한 사항
            </h2>
            <p>
              본 개인정보처리방침은 법령, 정책 또는 서비스 변경에 따라 수정될 수 있으며,
              변경 시 서비스 내 공지를 통해 안내드립니다.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            <p>본 개인정보처리방침은 2025년 2월 24일부터 시행됩니다.</p>
            <p className="mt-1">편하루 팀</p>
          </div>
        </div>
      </div>
    </div>
  );
}
