"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-lg font-bold text-gray-900">이용약관</h1>
      </div>

      {/* 본문 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6 text-gray-700 text-sm leading-relaxed">
          <p className="text-xs text-gray-400">시행일: 2025년 2월 24일</p>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제1조 (목적)</h2>
            <p>
              본 약관은 편하루(이하 &quot;서비스&quot;)가 제공하는 식품 알레르기 관리 서비스의
              이용과 관련하여 서비스와 이용자 간의 권리, 의무 및 책임사항, 기타
              필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제2조 (정의)</h2>
            <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>&quot;서비스&quot;란 편하루가 제공하는 식품 알레르기 관리 관련 모든 서비스를 의미합니다.</li>
              <li>&quot;이용자&quot;란 본 약관에 따라 서비스를 이용하는 자를 의미합니다.</li>
              <li>&quot;회원&quot;이란 서비스에 가입하여 계정을 보유한 이용자를 의미합니다.</li>
              <li>&quot;콘텐츠&quot;란 서비스 내에서 제공되는 텍스트, 이미지, 분석 결과 등 모든 정보를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제3조 (약관의 효력 및 변경)</h2>
            <ul className="list-decimal list-inside space-y-1">
              <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>서비스는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있습니다.</li>
              <li>약관이 변경되는 경우 변경 사항을 시행일 7일 전부터 서비스 내 공지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제4조 (서비스의 제공)</h2>
            <p>서비스는 다음과 같은 기능을 제공합니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>바코드 스캔을 통한 식품 알레르기 성분 확인</li>
              <li>AI 기반 식품 사진 분석 및 칼로리 추정</li>
              <li>학교 급식 알레르기 정보 확인</li>
              <li>AI 증상 분석 및 병원/약국 안내</li>
              <li>알레르기 맞춤 식당 추천</li>
              <li>커뮤니티 기능</li>
              <li>기타 알레르기 관리 관련 부가 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제5조 (서비스 이용 시 주의사항)</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="font-semibold text-amber-800">⚠️ 중요 안내</p>
              <ul className="list-disc list-inside space-y-1 text-amber-900">
                <li>
                  본 서비스에서 제공하는 알레르기 정보, AI 분석 결과, 칼로리 추정치 등은
                  참고용 정보이며, 의학적 진단이나 처방을 대체하지 않습니다.
                </li>
                <li>
                  AI 기반 분석은 100% 정확하지 않을 수 있으므로, 심각한 알레르기가 있는
                  경우 반드시 전문의와 상담하시기 바랍니다.
                </li>
                <li>
                  식품 성분 정보는 제조사 데이터 및 AI 분석에 기반하며, 실제 제품과
                  차이가 있을 수 있습니다.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제6조 (회원가입 및 계정)</h2>
            <ul className="list-decimal list-inside space-y-1">
              <li>이용자는 서비스가 정한 절차에 따라 회원가입을 신청할 수 있습니다.</li>
              <li>회원은 자신의 계정 정보를 관리할 책임이 있으며, 제3자에게 이를 양도하거나 대여할 수 없습니다.</li>
              <li>회원은 언제든지 서비스 내 설정을 통해 탈퇴를 요청할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제7조 (이용자의 의무)</h2>
            <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>타인의 정보를 도용하거나 허위 정보를 등록하는 행위</li>
              <li>서비스의 정상적인 운영을 방해하는 행위</li>
              <li>다른 이용자의 개인정보를 무단으로 수집하는 행위</li>
              <li>서비스를 이용하여 법령 또는 공공질서에 반하는 행위</li>
              <li>커뮤니티 내 욕설, 비방, 허위사실 유포 등 부적절한 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제8조 (면책 조항)</h2>
            <ul className="list-decimal list-inside space-y-1">
              <li>서비스는 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
              <li>서비스에서 제공하는 정보의 정확성, 완전성에 대해 보증하지 않으며, 이를 기반으로 한 이용자의 판단과 행동에 대해 책임을 지지 않습니다.</li>
              <li>이용자 간 또는 이용자와 제3자 간의 분쟁에 대해 서비스는 개입하거나 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제9조 (지적재산권)</h2>
            <p>
              서비스가 제공하는 콘텐츠에 대한 저작권 및 지적재산권은 서비스에 귀속됩니다.
              이용자가 서비스 내에 게시한 콘텐츠의 저작권은 해당 이용자에게 귀속되나,
              서비스 운영 목적 범위 내에서 이를 사용할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2">제10조 (분쟁 해결)</h2>
            <p>
              본 약관과 관련하여 분쟁이 발생한 경우, 서비스와 이용자는 원만한 해결을
              위해 성실히 협의합니다. 협의가 이루어지지 않을 경우 관련 법령에 따른
              관할 법원에서 해결합니다.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            <p>본 약관은 2025년 2월 24일부터 시행됩니다.</p>
            <p className="mt-1">편하루 팀</p>
          </div>
        </div>
      </div>
    </div>
  );
}
