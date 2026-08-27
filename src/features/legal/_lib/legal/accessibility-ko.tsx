import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";

import type { LegalDocument } from "@/features/legal/_lib/legal/legal-document";

/** 접근성 목표와 알려진 제한의 한국어 원문. */
const ACCESSIBILITY_KO: LegalDocument = {
  eyebrow: "Accessibility",
  title: "접근성 안내",
  effective: "최근 점검일: 2026년 8월 10일",
  sections: [
    {
      title: "목표",
      content: (
        <p>
          이 포트폴리오는 WCAG 2.2 AA를 목표로 키보드, 스크린리더, 확대 보기와 다양한 화면
          크기에서 콘텐츠를 이용할 수 있도록 지속적으로 개선합니다.
        </p>
      ),
    },
    {
      title: "적용한 조치",
      content: (
        <ul>
          <li>의미 있는 문서 구조와 페이지별 언어 선언</li>
          <li>키보드로 조작 가능한 내비게이션, 메뉴, 모달과 폼</li>
          <li>움직임 감소 설정과 라이트·다크 테마 지원</li>
          <li>대표 공개 페이지의 자동화된 axe 접근성 회귀 검사</li>
        </ul>
      ),
    },
    {
      title: "알려진 제한",
      content: (
        <p>
          지도, YouTube, hCaptcha 같은 외부 콘텐츠는 제공자의 접근성 지원에 영향을 받습니다. 사진
          대체 텍스트와 오래된 콘텐츠는 계속 점검 중입니다. 자동 검사 통과만으로 모든 사용자
          환경의 완전한 적합성을 보장하지는 않습니다.
        </p>
      ),
    },
    {
      title: "피드백",
      content: (
        <p>
          접근 장벽을 발견하면 페이지 주소, 사용 환경과 겪은 문제를{" "}
          <LocalizedLink href={ROUTES.CONTACT}>연락 페이지</LocalizedLink>로 알려 주세요. 가능한
          대체 접근 방법을 안내하고 개선 사항을 검토하겠습니다.
        </p>
      ),
    },
    {
      title: "기술 범위",
      content: (
        <p>
          최신 주요 브라우저의 HTML, CSS, JavaScript와 WAI-ARIA 지원을 전제로 합니다. JavaScript를
          차단하면 일부 내비게이션, 모달, 지도와 챗봇 기능이 제한될 수 있지만 명시적인 공개 URL의
          핵심 콘텐츠 접근은 유지하는 것을 목표로 합니다.
        </p>
      ),
    },
  ],
};

export { ACCESSIBILITY_KO };
