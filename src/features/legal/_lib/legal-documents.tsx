import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { ROUTES } from "@/constants/routes";
import { SENTRY_DSN, SENTRY_TRANSFER_COUNTRY } from "@/lib/monitoring/monitoring-dsn";

import type { Lang } from "@/types/lang";
import type { ReactNode } from "react";

/** 법적·운영 문서 안의 제목 있는 본문 단위. */
type LegalSection = { title: string; content: ReactNode };
/** 공용 문서 레이아웃에 전달하는 언어별 정적 원문. */
type LegalDocument = {
  eyebrow: string;
  title: string;
  effective: string;
  sections: readonly LegalSection[];
};
/** 공용 레이아웃으로 제공하는 문서 종류. */
type LegalDocumentKind = "privacy" | "terms" | "accessibility";

/** Privacy 본문에서 참조하는 외부 제공자의 공식 데이터 처리 문서. */
const EXTERNAL_POLICY_URLS = {
  web3Forms: "https://web3forms.com/privacy",
  googleAnalytics: "https://support.google.com/analytics/answer/6004245",
  googlePrivacyContact: "https://support.google.com/policies/contact/general_privacy_form",
  openAi: "https://platform.openai.com/docs/models/default-usage-policies-by-endpoint",
  gemini: "https://ai.google.dev/gemini-api/docs/zdr",
  sentry: "https://sentry.io/privacy/",
} as const;

const SENTRY_ENABLED = Boolean(SENTRY_DSN);

/**
 * 좁은 화면에서 표만 독립적으로 가로 스크롤하며 키보드 포커스도 받을 수 있게 한다.
 *
 * @param {{ children: ReactNode; label: string }} props 컴포넌트 속성.
 * @param {ReactNode} props.children 스크롤 영역에 표시할 표.
 * @param {string} props.label 스크린리더가 표 영역을 구분할 이름.
 * @returns {JSX.Element} 키보드로 접근할 수 있는 표 스크롤 영역.
 */
const LegalTableScroll = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className="legal-document-table-scroll" role="region" aria-label={label} tabIndex={0}>
    {children}
  </div>
);

/** 개인정보 처리와 로컬 저장소 계약의 한국어·영어 원문. */
const PRIVACY: Record<Lang, LegalDocument> = {
  ko: {
    eyebrow: "Privacy",
    title: "개인정보 처리방침",
    effective: "시행일: 2026년 8월 10일",
    sections: [
      {
        title: "운영자와 문의",
        content: (
          <p>
            이 사이트는 이성준이 운영하는 개인 포트폴리오입니다. 개인정보의 열람·정정·삭제,
            처리정지, 동의 철회 또는 기타 개인정보 관련 문의는{" "}
            <LocalizedLink href={ROUTES.CONTACT}>연락 페이지</LocalizedLink>를 이용해 주세요.
          </p>
        ),
      },
      {
        title: "처리하는 정보와 목적",
        content: (
          <>
            <LegalTableScroll label="처리 정보와 보유 기간 표">
              <table>
                <thead>
                  <tr>
                    <th>정보</th>
                    <th>목적</th>
                    <th>보유</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>이름, 이메일, 문의 내용</td>
                    <td>문의 전달과 회신</td>
                    <td>문의 목적 달성 또는 삭제 요청 시까지. Web3Forms는 정책상 최대 3년</td>
                  </tr>
                  <tr>
                    <td>챗봇 질문과 제한된 대화 문맥</td>
                    <td>AI 답변 생성</td>
                    <td>사이트 DB에 저장하지 않으며 새로고침 시 브라우저 메모리에서 삭제</td>
                  </tr>
                  <tr>
                    <td>해시된 IP 제한 키</td>
                    <td>챗봇 남용 방지</td>
                    <td>약 1분</td>
                  </tr>
                  <tr>
                    <td>방문 페이지와 일반 기기·브라우저 정보</td>
                    <td>동의한 경우의 이용 통계</td>
                    <td>Google Analytics 설정과 정책에 따름</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>
                        오류 내용, 발생 시점의 화면 재현, 일반 기기·브라우저 정보와 접속 지역(도시
                        단위)
                      </td>
                      <td>동의한 방문자의 오류 진단과 수정</td>
                      <td>Sentry Developer 플랜 · 30일</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </LegalTableScroll>
            <p>
              호스팅·보안·오류 대응 과정에서는 IP 주소, 요청 시각, 요청 경로와 사용자 에이전트가
              서비스 제공자의 표준 로그에 일시적으로 기록될 수 있습니다.
            </p>
          </>
        ),
      },
      {
        title: "언어, 쿠키와 로컬 저장소",
        content: (
          <>
            <p>
              언어가 없는 루트 주소에서는 브라우저의 <code>Accept-Language</code>를 읽어 한국어 또는
              영어 페이지를 추천하며 헤더 원문은 별도로 저장하지 않습니다.
            </p>
            <LegalTableScroll label="쿠키와 로컬 저장소 표">
              <table>
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>목적</th>
                    <th>종류·기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>ap-lang-pref-v1</code>
                    </td>
                    <td>직접 선택한 언어 기억</td>
                    <td>기능성 first-party 쿠키 · 30일</td>
                  </tr>
                  <tr>
                    <td>
                      <code>ap-consent:v3</code>
                    </td>
                    <td>방문 분석과 오류 보고의 개별 허용·거부 선택 기억</td>
                    <td>localStorage · 180일</td>
                  </tr>
                  <tr>
                    <td>
                      <code>_ga</code>, <code>_ga_*</code>
                    </td>
                    <td>동의한 방문자의 GA4 통계 구분과 상태 유지</td>
                    <td>선택적 분석 쿠키 · Google 기본 설정상 최대 2년</td>
                  </tr>
                  <tr>
                    <td>
                      <code>ap-contact-draft:v1</code>
                    </td>
                    <td>
                      방문자가 이어 쓰기 버튼을 누르면 챗봇에서 작성한 연락 초안을 연락 페이지
                      입력란으로 전달
                    </td>
                    <td>sessionStorage · 연락 페이지가 읽는 즉시 삭제, 최대 10분</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>
                        <code>sentryReplaySession</code>
                      </td>
                      <td>동의한 방문자의 오류 화면 재현 세션 구분</td>
                      <td>sessionStorage · 탭을 닫으면 삭제</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </LegalTableScroll>
            <p>
              언어 쿠키는 사용자가 메뉴에서 직접 선택할 때만 생성하며 분석 식별자와 결합하지
              않습니다. 분석·오류 수집 관련 쿠키와 저장값은 허용한 뒤에만 생성됩니다. Footer의
              개인정보 및 쿠키 설정이나 브라우저 설정에서 선택을 변경하고 저장값을 삭제할 수
              있습니다.
            </p>
          </>
        ),
      },
      {
        title: "외부 처리와 국외 전송",
        content: (
          <>
            <p>
              아래 기능은 정보를 방문자의 거주국 밖에 있는 제공자 서버로 전송할 수 있습니다. 실제
              처리 지역과 추가 보유는 각 사업자의 계약·정책, 계정 및 배포 설정에 따릅니다.
            </p>
            <h3>선택 기능의 국외 이전</h3>
            <LegalTableScroll label="선택 기능 국외 이전 상세 표">
              <table>
                <thead>
                  <tr>
                    <th>이전받는 자·연락처</th>
                    <th>항목</th>
                    <th>국가·시기·방법</th>
                    <th>목적·보유 기간</th>
                    <th>거부 방법과 영향</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Google LLC ·{" "}
                      <a href={EXTERNAL_POLICY_URLS.googlePrivacyContact}>
                        개인정보 보호 문의 양식
                      </a>
                    </td>
                    <td>방문 페이지, 이벤트, 일반 기기·브라우저 정보</td>
                    <td>미국 · 페이지 방문 등 이벤트 발생 시 · HTTPS</td>
                    <td>이용 통계 · 이벤트 데이터 14개월</td>
                    <td>동의 설정에서 방문 분석을 끌 수 있으며 사이트 기능에는 영향 없음</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>Sentry, Inc. · privacy@sentry.io</td>
                      <td>
                        오류 내용, 오류 발생 전후 화면 기록, 일반 기기·브라우저 정보와 접속
                        지역(도시 단위)
                      </td>
                      <td>
                        {SENTRY_TRANSFER_COUNTRY.ko} · 오류 발생 시 · 동일 출처 터널을 거친 HTTPS
                      </td>
                      <td>오류 진단과 수정 · 30일</td>
                      <td>동의 설정에서 오류 보고를 끌 수 있으며 사이트 기능에는 영향 없음</td>
                    </tr>
                  ) : null}
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>
                        OpenAI, L.L.C. 및/또는 Google LLC ·{" "}
                        <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI</a> ·{" "}
                        <a href={EXTERNAL_POLICY_URLS.gemini}>Google</a>
                      </td>
                      <td>오류 제목·유형·메시지, 코드 스택 위치, 배포 환경과 릴리즈</td>
                      <td>미국 · 오류 알림 발생 시 · HTTPS</td>
                      <td>오류 심각도 판정과 조치 제안 · 사이트에 저장하지 않음</td>
                      <td>동의 설정에서 오류 보고를 끌 수 있으며 사이트 기능에는 영향 없음</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </LegalTableScroll>
            <LegalTableScroll label="외부 제공자와 전송 정보 표">
              <table>
                <thead>
                  <tr>
                    <th>제공자</th>
                    <th>전송 정보</th>
                    <th>목적</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Vercel</td>
                    <td>요청·서비스 로그</td>
                    <td>호스팅, 보안과 오류 대응</td>
                  </tr>
                  <tr>
                    <td>Web3Forms, hCaptcha</td>
                    <td>문의 내용, 캡차 토큰과 요청 정보</td>
                    <td>문의 전달과 스팸 방지</td>
                  </tr>
                  <tr>
                    <td>Google Analytics</td>
                    <td>동의한 방문·기기 정보</td>
                    <td>사이트 이용 통계</td>
                  </tr>
                  <tr>
                    <td>OpenAI 및/또는 Google Gemini</td>
                    <td>챗봇 질문과 제한된 문맥</td>
                    <td>AI 답변 생성</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>Sentry</td>
                      <td>동의한 방문자의 오류 정보와 오류 전후 화면 기록, 서버 오류 로그</td>
                      <td>오류 진단과 수정</td>
                    </tr>
                  ) : null}
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>OpenAI 및/또는 Google Gemini</td>
                      <td>오류 요약(제목·유형·메시지·코드 스택 위치·배포 환경·릴리즈)</td>
                      <td>오류 심각도 판정과 조치 제안</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td>Upstash</td>
                    <td>SHA-256 해시 IP 키와 집계 수</td>
                    <td>챗봇 요청 제한</td>
                  </tr>
                </tbody>
              </table>
            </LegalTableScroll>
            <p>
              OpenAI 요청에는 애플리케이션 상태 저장을 끄는 <code>store: false</code>를 적용합니다.
              다만 OpenAI와 Google은 남용 방지 로그를 각 계정 설정과 정책에 따라 제한된 기간 보관할
              수 있습니다. Google Analytics의 광고 개인화와 Google Signals는 사용하지 않습니다.
              민감한 개인정보를 문의나 챗봇에 입력하지 마세요.
            </p>
            {SENTRY_ENABLED ? (
              <p>
                브라우저 오류 수집과 화면 재현은 동의한 뒤에만 시작하며, 화면 재현에서 입력값과 챗봇
                대화 영역은 가려집니다. 서버 오류 로그는 서비스 정상 동작 확인을 위해 동의와
                무관하게 기록하되, 인증 정보·쿠키·요청 본문·방문자 식별 정보를 제거한 오류 내용만
                전송합니다.
              </p>
            ) : null}
            {SENTRY_ENABLED ? (
              <p>
                오류 알림의 심각도와 조치를 판정하기 위해 오류 요약을 AI 제공자에게 한 번 더
                전송합니다. 보내는 항목은 오류 제목·유형·메시지, 코드 스택 위치, 배포 환경과
                릴리즈로 한정하며, 접속 주소·요청 헤더·요청 본문·화면 기록·접속 지역과 방문자 식별
                정보는 포함하지 않습니다.
              </p>
            ) : null}
            <p>
              자세한 처리 조건은{" "}
              <a href={EXTERNAL_POLICY_URLS.web3Forms}>Web3Forms 개인정보처리방침</a>,{" "}
              <a href={EXTERNAL_POLICY_URLS.googleAnalytics}>Google Analytics 개인정보 보호 안내</a>
              , <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI API 데이터 제어 안내</a>,{" "}
              <a href={EXTERNAL_POLICY_URLS.gemini}>Gemini API 데이터 보관 안내</a>
              {SENTRY_ENABLED ? (
                <>
                  와 <a href={EXTERNAL_POLICY_URLS.sentry}>Sentry 개인정보처리방침</a>
                </>
              ) : null}
              에서 확인할 수 있습니다.
            </p>
          </>
        ),
      },
      {
        title: "삭제, 권리 행사와 변경",
        content: (
          <>
            <p>
              보유 목적이 끝나거나 유효한 삭제 요청을 받으면 사이트가 관리하는 정보를 지체 없이
              삭제합니다. 브라우저 저장값은 방문자가 직접 삭제할 수 있습니다. 외부 제공자에 이미
              전달된 정보는 해당 제공자의 절차와 법정 보존 의무에 따라 처리됩니다.
            </p>
            <p>
              권리 행사를 이유로 부당한 불이익을 주지 않습니다. 사용하는 서비스, 처리 목적 또는 보유
              기간이 바뀌면 이 문서의 시행일과 내용을 함께 갱신합니다.
            </p>
          </>
        ),
      },
    ],
  },
  en: {
    eyebrow: "Privacy",
    title: "Privacy Policy",
    effective: "Effective: August 10, 2026",
    sections: [
      {
        title: "Operator and contact",
        content: (
          <p>
            This personal portfolio is operated by Sungjoon Lee. To request access, correction,
            deletion, restriction, withdrawal of consent, or help with any privacy matter, use the{" "}
            <LocalizedLink href={ROUTES.CONTACT}>contact page</LocalizedLink>.
          </p>
        ),
      },
      {
        title: "Information, purposes, and retention",
        content: (
          <>
            <LegalTableScroll label="Information and retention table">
              <table>
                <thead>
                  <tr>
                    <th>Information</th>
                    <th>Purpose</th>
                    <th>Retention</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Name, email, and enquiry</td>
                    <td>Deliver and answer an enquiry</td>
                    <td>
                      Until the enquiry is resolved or deletion is requested; Web3Forms policy
                      allows retention for up to three years
                    </td>
                  </tr>
                  <tr>
                    <td>Chatbot question and limited context</td>
                    <td>Generate an AI response</td>
                    <td>Not stored in the site database; removed from browser memory on refresh</td>
                  </tr>
                  <tr>
                    <td>Hashed IP rate-limit key</td>
                    <td>Prevent chatbot abuse</td>
                    <td>About one minute</td>
                  </tr>
                  <tr>
                    <td>Visited pages and general device/browser data</td>
                    <td>Consented usage analytics</td>
                    <td>Under Google Analytics settings and policy</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>
                        Error details, a screen replay of the failure, general device data, and
                        approximate city-level location
                      </td>
                      <td>Error diagnosis and fixes for consenting visitors</td>
                      <td>Sentry Developer plan · 30 days</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </LegalTableScroll>
            <p>
              Hosting, security, and error handling may also temporarily create standard provider
              logs containing an IP address, request time, path, and user agent.
            </p>
          </>
        ),
      },
      {
        title: "Language, cookies, and local storage",
        content: (
          <>
            <p>
              At the unprefixed root URL, the site reads <code>Accept-Language</code> to suggest
              Korean or English. The raw header is not separately stored.
            </p>
            <LegalTableScroll label="Cookies and local storage table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Purpose</th>
                    <th>Type and duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>ap-lang-pref-v1</code>
                    </td>
                    <td>Remember an explicit language choice</td>
                    <td>Functional first-party cookie · 30 days</td>
                  </tr>
                  <tr>
                    <td>
                      <code>ap-consent:v3</code>
                    </td>
                    <td>Remember separate analytics and error-reporting choices</td>
                    <td>localStorage · 180 days</td>
                  </tr>
                  <tr>
                    <td>
                      <code>_ga</code>, <code>_ga_*</code>
                    </td>
                    <td>Measure consented visits and retain analytics state</td>
                    <td>Optional analytics cookies · up to two years under Google defaults</td>
                  </tr>
                  <tr>
                    <td>
                      <code>ap-contact-draft:v1</code>
                    </td>
                    <td>
                      Transfer a chatbot contact draft to the contact form after the visitor presses
                      the continue button
                    </td>
                    <td>
                      sessionStorage · deleted as soon as the contact page reads it, 10 minutes at
                      most
                    </td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>
                        <code>sentryReplaySession</code>
                      </td>
                      <td>Identify a consented error replay session</td>
                      <td>sessionStorage · removed when the tab closes</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </LegalTableScroll>
            <p>
              The language cookie is created only after a menu choice and is not combined with
              analytics identifiers. Analytics and error-reporting storage is created only after
              permission. Change the choice in Privacy &amp; cookie settings in the footer or clear
              site storage in the browser.
            </p>
          </>
        ),
      },
      {
        title: "External processing and international transfers",
        content: (
          <>
            <p>
              The features below may transmit information to provider servers outside the visitor’s
              country. Processing regions and retention depend on provider terms, account settings,
              and deployment configuration.
            </p>
            <h3>International transfers for optional features</h3>
            <LegalTableScroll label="Optional feature transfer details">
              <table>
                <thead>
                  <tr>
                    <th>Recipient and contact</th>
                    <th>Information</th>
                    <th>Country, timing, and method</th>
                    <th>Purpose and retention</th>
                    <th>How to refuse and effect</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Google LLC ·{" "}
                      <a href={EXTERNAL_POLICY_URLS.googlePrivacyContact}>privacy contact form</a>
                    </td>
                    <td>Visited pages, events, and general device/browser information</td>
                    <td>United States · when an event occurs · HTTPS</td>
                    <td>Usage analytics · event data for 14 months</td>
                    <td>Turn off Visitor analytics in settings; site features remain available</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>Sentry, Inc. · privacy@sentry.io</td>
                      <td>
                        Error details, recording around an error, general device/browser data, and
                        approximate city-level location
                      </td>
                      <td>
                        {SENTRY_TRANSFER_COUNTRY.en} · when an error occurs · HTTPS through a
                        same-origin tunnel
                      </td>
                      <td>Error diagnosis and fixes · 30 days</td>
                      <td>Turn off Error reporting in settings; site features remain available</td>
                    </tr>
                  ) : null}
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>
                        OpenAI, L.L.C. and/or Google LLC ·{" "}
                        <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI</a> ·{" "}
                        <a href={EXTERNAL_POLICY_URLS.gemini}>Google</a>
                      </td>
                      <td>
                        Error title, type, message, code stack locations, deployment environment and
                        release
                      </td>
                      <td>United States · when an error alert fires · HTTPS</td>
                      <td>Severity triage and suggested fixes · not stored by this site</td>
                      <td>Turn off Error reporting in settings; site features remain available</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </LegalTableScroll>
            <LegalTableScroll label="External providers and transfers table">
              <table>
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Information</th>
                    <th>Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Vercel</td>
                    <td>Request and service logs</td>
                    <td>Hosting, security, and error handling</td>
                  </tr>
                  <tr>
                    <td>Web3Forms, hCaptcha</td>
                    <td>Enquiry, captcha token, and request information</td>
                    <td>Enquiry delivery and spam prevention</td>
                  </tr>
                  <tr>
                    <td>Google Analytics</td>
                    <td>Consented visit and device data</td>
                    <td>Site usage analytics</td>
                  </tr>
                  <tr>
                    <td>OpenAI and/or Google Gemini</td>
                    <td>Chatbot question and limited context</td>
                    <td>AI response generation</td>
                  </tr>
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>Sentry</td>
                      <td>
                        Error details and screen replays from consenting visitors; server error logs
                      </td>
                      <td>Error diagnosis and fixes</td>
                    </tr>
                  ) : null}
                  {SENTRY_ENABLED ? (
                    <tr>
                      <td>OpenAI and/or Google Gemini</td>
                      <td>
                        Error summary (title, type, message, code stack locations, environment,
                        release)
                      </td>
                      <td>Severity triage and suggested fixes</td>
                    </tr>
                  ) : null}
                  <tr>
                    <td>Upstash</td>
                    <td>SHA-256 hashed IP key and aggregate count</td>
                    <td>Chatbot rate limiting</td>
                  </tr>
                </tbody>
              </table>
            </LegalTableScroll>
            <p>
              OpenAI requests set <code>store: false</code> to disable application-state storage.
              OpenAI and Google may still retain limited abuse-monitoring logs under their policies
              and account settings. Google Signals and advertising personalisation are disabled. Do
              not submit sensitive personal information through the form or chatbot.
            </p>
            {SENTRY_ENABLED ? (
              <p>
                Browser error reporting and screen replay start only after permission, and replays
                mask typed input and the chatbot conversation area. Server error logs are recorded
                regardless of consent to keep the service working, but only after removing
                credentials, cookies, request bodies, and visitor identifiers.
              </p>
            ) : null}
            {SENTRY_ENABLED ? (
              <p>
                To triage the severity of an error alert and suggest a fix, an error summary is sent
                once more to an AI provider. That summary is limited to the error title, type,
                message, code stack locations, deployment environment, and release. It excludes the
                visited URL, request headers, request bodies, screen replays, location, and visitor
                identifiers.
              </p>
            ) : null}
            <p>
              See the official data terms from{" "}
              <a href={EXTERNAL_POLICY_URLS.web3Forms}>Web3Forms</a>,{" "}
              <a href={EXTERNAL_POLICY_URLS.googleAnalytics}>Google Analytics</a>,{" "}
              <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI API</a>,{" "}
              <a href={EXTERNAL_POLICY_URLS.gemini}>Gemini API</a>
              {SENTRY_ENABLED ? (
                <>
                  , and <a href={EXTERNAL_POLICY_URLS.sentry}>Sentry</a>
                </>
              ) : null}{" "}
              for provider-specific details.
            </p>
          </>
        ),
      },
      {
        title: "Deletion, rights, and changes",
        content: (
          <>
            <p>
              Information controlled by the site is deleted without undue delay when its purpose
              ends or a valid deletion request is received. Browser storage can be deleted directly
              by the visitor. Information already transmitted to a provider follows that provider’s
              process and any legal retention duty.
            </p>
            <p>
              You will not be unfairly disadvantaged for exercising privacy rights. If services,
              purposes, or retention change, this document and its effective date will be updated
              together.
            </p>
          </>
        ),
      },
    ],
  },
};

/** 저작권, 외부 서비스와 챗봇 이용 범위를 설명하는 한국어·영어 원문. */
const TERMS: Record<Lang, LegalDocument> = {
  ko: {
    eyebrow: "Terms & Content",
    title: "사이트 이용 및 콘텐츠 안내",
    effective: "시행일: 2026년 8월 10일",
    sections: [
      {
        title: "사이트의 목적",
        content: (
          <p>
            이 사이트는 이성준의 사진, 음악과 개발 작업을 소개하는 개인 포트폴리오입니다. 별도
            표시가 없는 정보는 작성 또는 공개 당시를 기준으로 하며 예고 없이 수정되거나 중단될 수
            있습니다.
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
              포스터, 로고와 외부 자료에는 연주자·작곡가·촬영자·주최자 또는 원 권리자의 권리가
              별도로 적용될 수 있습니다.
            </p>
          </>
        ),
      },
      {
        title: "외부 링크와 서비스",
        content: (
          <p>
            GitHub, YouTube, 지도, 티켓과 기타 외부 링크는 편의를 위해 제공합니다. 외부 사이트의
            내용, 가용성, 보안 또는 개인정보 처리 방식은 해당 운영자가 책임지며 이 사이트가 이를
            보증하거나 추천한다는 의미는 아닙니다.
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
            사이트 또는 다른 방문자의 안전을 해치는 접근, 보안 통제 우회, 서비스 방해, 권리 침해,
            허가 없는 콘텐츠 대량 수집과 재배포를 금지합니다. 정상적인 검색엔진 색인과 접근성 도구의
            이용은 제한하지 않습니다.
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
  },
  en: {
    eyebrow: "Terms & Content",
    title: "Site Use & Content Notice",
    effective: "Effective: August 10, 2026",
    sections: [
      {
        title: "Purpose",
        content: (
          <p>
            This personal portfolio shows photography, music, and development work by Sungjoon Lee.
            Unless stated otherwise, information reflects the time it was written or published and
            may be changed or withdrawn without notice.
          </p>
        ),
      },
      {
        title: "Copyright and reuse",
        content: (
          <>
            <p>
              Rights in original photography, writing, design, and other site content belong to
              Sungjoon Lee. Apart from personal viewing and ordinary link sharing, reproduction,
              redistribution, modification, or commercial use requires prior permission.
            </p>
            <p>
              The licence shown in each open-source repository governs code from that repository.
              Performance video, audio, posters, logos, and external materials may carry separate
              rights belonging to performers, composers, photographers, organisers, or other owners.
            </p>
          </>
        ),
      },
      {
        title: "External links and services",
        content: (
          <p>
            GitHub, YouTube, maps, ticketing, and other external links are provided for convenience.
            Their operators are responsible for content, availability, security, and privacy
            practices. A link does not by itself imply endorsement or warranty.
          </p>
        ),
      },
      {
        title: "AI chatbot",
        content: (
          <p>
            Chatbot responses are generated automatically and may be inaccurate or outdated. The
            original portfolio page takes priority. The chatbot does not provide medical, legal,
            financial, or other professional advice.
          </p>
        ),
      },
      {
        title: "Prohibited use",
        content: (
          <p>
            Do not compromise site or visitor safety, bypass security controls, disrupt service,
            infringe rights, or perform unauthorised bulk collection and redistribution. This does
            not restrict normal search indexing or accessibility tools.
          </p>
        ),
      },
      {
        title: "Contact and changes",
        content: (
          <p>
            For content permission, infringement concerns, or questions about this notice, use the{" "}
            <LocalizedLink href={ROUTES.CONTACT}>contact page</LocalizedLink>. Material changes will
            be reflected here with an updated effective date.
          </p>
        ),
      },
    ],
  },
};

/** 접근성 목표, 적용 조치와 피드백 절차의 한국어·영어 원문. */
const ACCESSIBILITY: Record<Lang, LegalDocument> = {
  ko: {
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
  },
  en: {
    eyebrow: "Accessibility",
    title: "Accessibility Statement",
    effective: "Last reviewed: August 10, 2026",
    sections: [
      {
        title: "Commitment",
        content: (
          <p>
            This portfolio aims to meet WCAG 2.2 Level AA. Its content should remain usable with a
            keyboard, screen reader, browser zoom, and across different viewport sizes.
          </p>
        ),
      },
      {
        title: "Measures",
        content: (
          <ul>
            <li>Semantic document structure and a declared language for each page</li>
            <li>Keyboard-operable navigation, menus, dialogs, and forms</li>
            <li>Reduced-motion support and light/dark themes</li>
            <li>Automated axe accessibility regression checks on representative public pages</li>
          </ul>
        ),
      },
      {
        title: "Known limitations",
        content: (
          <p>
            External content such as maps, YouTube, and hCaptcha depends on provider accessibility.
            Photo alternative text and older content remain under review. Passing automated checks
            alone does not establish complete conformance in every user environment.
          </p>
        ),
      },
      {
        title: "Feedback",
        content: (
          <p>
            If you encounter a barrier, please share the page, environment, and problem through the{" "}
            <LocalizedLink href={ROUTES.CONTACT}>contact page</LocalizedLink>. Where possible, the
            operator will suggest another way to access the content and review the reported issue.
          </p>
        ),
      },
      {
        title: "Technical scope",
        content: (
          <p>
            The site relies on HTML, CSS, JavaScript, and WAI-ARIA support in current major
            browsers. Blocking JavaScript may limit navigation, dialogs, maps, and chatbot features,
            while explicit public URLs aim to retain access to core content.
          </p>
        ),
      },
    ],
  },
};

const LEGAL_DOCUMENTS: Record<LegalDocumentKind, Record<Lang, LegalDocument>> = {
  privacy: PRIVACY,
  terms: TERMS,
  accessibility: ACCESSIBILITY,
};

/**
 * 문서 종류와 URL 언어에 대응하는 정적 원문을 반환한다.
 *
 * @param {LegalDocumentKind} kind - 개인정보, 이용 안내 또는 접근성 문서 종류.
 * @param {Lang} lang - 반환할 문서의 지원 언어.
 * @returns {LegalDocument} 공용 레이아웃에 바로 전달할 문서 원문.
 */
const getLegalDocument = (kind: LegalDocumentKind, lang: Lang): LegalDocument =>
  LEGAL_DOCUMENTS[kind][lang];

export { getLegalDocument };
export type { LegalDocument, LegalDocumentKind };
