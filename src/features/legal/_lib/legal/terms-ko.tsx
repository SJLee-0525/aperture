import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";

import type { LegalDocument } from "@/features/legal/_lib/legal/legal-document";

/** 사이트 이용과 콘텐츠 안내의 한국어 원문. */
const TERMS_KO: LegalDocument = {
  eyebrow: "Terms & Content",
  title: "사이트 이용 및 콘텐츠 안내",
  effective: "시행일: 2026년 8월 10일",
  sections: [
    {
      title: "사이트의 목적",
      content: (
        <p>
          이 사이트는 이성준의 사진, 음악과 개발 작업을 소개하는 개인 포트폴리오입니다. 별도 표시가
          없는 정보는 작성 또는 공개 당시를 기준으로 하며 예고 없이 수정되거나 중단될 수 있습니다.
        </p>
      ),
    },
    {
      title: "저작권과 이용",
      content: (
        <>
          <p>
            사이트가 직접 제작한 사진, 글, 디자인과 기타 콘텐츠의 권리는 이성준에게 있습니다. 개인
            감상과 일반적인 링크 공유를 제외한 복제, 재배포, 수정, 상업적 이용에는 사전 허락이
            필요합니다.
          </p>
          <p>
            오픈소스 저장소의 코드는 각 저장소에 표시된 라이선스가 우선합니다. 공연 영상, 음원,
            포스터, 로고와 외부 자료에는 연주자·작곡가·촬영자·주최자 또는 원 권리자의 권리가 별도로
            적용될 수 있습니다.
          </p>
        </>
      ),
    },
    {
      title: "외부 링크와 서비스",
      content: (
        <p>
          GitHub, YouTube, 지도, 티켓과 기타 외부 링크는 편의를 위해 제공합니다. 외부 사이트의 내용,
          가용성, 보안 또는 개인정보 처리 방식은 해당 운영자가 책임지며 이 사이트가 이를 보증하거나
          추천한다는 의미는 아닙니다.
        </p>
      ),
    },
    {
      title: "AI 챗봇",
      content: (
        <p>
          챗봇 답변은 자동 생성되므로 부정확하거나 오래된 정보가 포함될 수 있습니다. 프로젝트의
          정확한 설명은 원본 포트폴리오 페이지가 우선하며, 챗봇은 의료·법률·재무 또는 기타 전문
          자문을 제공하지 않습니다.
        </p>
      ),
    },
    {
      title: "허용되지 않는 이용",
      content: (
        <p>
          사이트 또는 다른 방문자의 안전을 해치는 접근, 보안 통제 우회, 서비스 방해, 권리 침해, 허가
          없는 콘텐츠 대량 수집과 재배포를 금지합니다. 정상적인 검색엔진 색인과 접근성 도구의 이용은
          제한하지 않습니다.
        </p>
      ),
    },
    {
      title: "문의와 변경",
      content: (
        <p>
          콘텐츠 사용 허가, 권리 침해 또는 이 안내에 관한 문의는{" "}
          <LocalizedLink href={ROUTES.CONTACT}>연락 페이지</LocalizedLink>를 이용해 주세요. 중요한
          변경은 시행일과 함께 이 페이지에 반영합니다.
        </p>
      ),
    },
  ],
};

export { TERMS_KO };
