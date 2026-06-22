import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '개인정보처리방침 — 스크립트 체인',
  description: '스크립트 체인 서비스의 개인정보처리방침입니다.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="h-[60px] flex items-center px-6 border-b border-gray-100 bg-white sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="14" fill="#10b981" fillOpacity="0.12" />
            <path d="M9 10c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M9 18c0 2.8 2.2 5 5 5s5-2.2 5-5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M14 5v18" stroke="#059669" strokeWidth="1.5" strokeDasharray="2 3" strokeLinecap="round" />
          </svg>
          <span className="text-base font-bold text-gray-900">스크립트 체인</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">개인정보처리방침</h1>
        <p className="text-sm text-gray-400 mb-10">최종 업데이트: 2026년 6월 22일</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-600">

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">1. 개요</h2>
            <p>
              스크립트 체인(이하 "서비스")은 드라마, 영화, 도서 등 콘텐츠 세계관을 시맨틱 지식 그래프로 시각화하는
              플랫폼입니다. 본 개인정보처리방침은 서비스 이용 과정에서 수집되는 정보의 종류, 사용 목적,
              제3자 제공 여부 등을 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">2. 수집하는 정보</h2>
            <p>서비스는 별도의 회원가입 없이 이용 가능하며, 다음과 같은 정보가 자동으로 수집될 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>서비스 접속 IP 주소, 브라우저 종류 및 버전</li>
              <li>방문한 페이지 및 검색 키워드 (익명 처리됨)</li>
              <li>쿠키 및 유사 추적 기술을 통해 수집되는 기기 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">3. 쿠키 사용</h2>
            <p>
              서비스는 이용자의 경험 향상을 위해 쿠키를 사용합니다. 쿠키는 웹사이트가 이용자의 브라우저에 저장하는
              소량의 데이터 파일로, 이용자가 서비스를 다시 방문할 때 설정을 기억하는 데 활용됩니다.
              브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있으나, 일부 기능이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">4. 광고 서비스 (Google AdSense)</h2>
            <p>
              서비스는 Google LLC가 제공하는 Google AdSense를 통해 광고를 게재합니다.
              Google AdSense는 이용자의 관심사에 맞는 광고를 제공하기 위해 쿠키 및 웹 비콘을 사용할 수 있습니다.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Google의 광고 파트너는 서비스 방문 기록을 기반으로 맞춤형 광고를 제공할 수 있습니다.</li>
              <li>이용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">Google 광고 설정</a>에서 맞춤형 광고를 비활성화할 수 있습니다.</li>
              <li>Google의 개인정보 보호 정책은 <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">policies.google.com/privacy</a>에서 확인할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">5. 외부 API 서비스 이용</h2>
            <p>서비스는 콘텐츠 정보 제공을 위해 다음 외부 API를 활용합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>네이버 검색 API:</strong> 도서 및 영화 검색 결과 제공 (검색어만 전송, 개인정보 미포함)</li>
              <li><strong>알라딘 OpenAPI:</strong> 도서 정보 및 커버 이미지 제공</li>
              <li><strong>Wikipedia REST API:</strong> 역사·배경 정보 요약 제공</li>
              <li><strong>도서관 정보나루:</strong> 도서관 대출 통계 데이터 제공</li>
            </ul>
            <p className="mt-2">위 외부 서비스는 각 서비스의 개인정보처리방침을 따릅니다.</p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">6. 개인정보의 제3자 제공</h2>
            <p>
              서비스는 법령에서 정한 경우를 제외하고, 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              단, 위 4항의 광고 서비스 운영을 위해 Google에 비식별화된 광고 관련 데이터가 전달될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">7. 이용자의 권리</h2>
            <p>이용자는 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>수집된 개인정보에 대한 열람 및 정정 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>브라우저 쿠키 삭제를 통한 추적 거부</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">8. 개인정보 보호책임자</h2>
            <p>
              개인정보 관련 문의 사항은 아래 이메일로 연락 주시기 바랍니다.
            </p>
            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
              <p><strong>이메일:</strong> ybm.ailab@gmail.com</p>
              <p className="mt-0.5"><strong>서비스명:</strong> 스크립트 체인 (Script Chain)</p>
            </div>
          </section>

          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3">9. 방침 변경</h2>
            <p>
              본 개인정보처리방침은 법령 또는 서비스 정책의 변경에 따라 수정될 수 있습니다.
              변경 시 서비스 내 공지사항을 통해 안내드립니다.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link href="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
            ← 스크립트 체인으로 돌아가기
          </Link>
        </div>
      </main>
    </div>
  );
}
