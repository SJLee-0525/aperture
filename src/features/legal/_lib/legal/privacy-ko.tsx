import { LocalizedLink } from "@/features/lang/_components/LocalizedLink";

import { LegalTableScroll } from "@/features/legal/_lib/legal/legal-document-parts";
import {
  EXTERNAL_POLICY_URLS,
  SENTRY_ENABLED,
} from "@/features/legal/_lib/legal/legal-document-parts";

import { ROUTES } from "@/constants/routes";
import { SENTRY_TRANSFER_COUNTRY } from "@/lib/monitoring/monitoring-dsn";

import type { LegalDocument } from "@/features/legal/_lib/legal/legal-document";

/** 개인정보 처리와 로컬 저장소 계약의 한국어 원문. */
const PRIVACY_KO: LegalDocument = {
  eyebrow: "Privacy",
  title: "개인정보 처리방침",
  effective: "시행일: 2026년 8월 10일",
  sections: [
    {
      title: "운영자와 문의",
      content: (
        <p>
          이 사이트는 이성준이 운영하는 개인 포트폴리오입니다. 개인정보의 열람·정정·삭제, 처리정지,
          동의 철회 또는 기타 개인정보 관련 문의는{" "}
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
                    <code>ap-lang:v1</code>
                  </td>
                  <td>직접 선택한 언어 기억</td>
                  <td>localStorage · 직접 지울 때까지</td>
                </tr>
                <tr>
                  <td>
                    <code>ap-theme:v1</code>
                  </td>
                  <td>밝은 화면·어두운 화면 선택 기억</td>
                  <td>localStorage · 직접 지울 때까지</td>
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
            언어 쿠키는 사용자가 메뉴에서 직접 선택할 때만 생성하며 분석 식별자와 결합하지 않습니다.
            분석·오류 수집 관련 쿠키와 저장값은 허용한 뒤에만 생성됩니다. Footer의 개인정보 및 쿠키
            설정이나 브라우저 설정에서 선택을 변경하고 저장값을 삭제할 수 있습니다.
          </p>
        </>
      ),
    },
    {
      title: "외부 처리와 국외 전송",
      content: (
        <>
          <p>
            아래 기능은 정보를 방문자의 거주국 밖에 있는 제공자 서버로 전송할 수 있습니다. 실제 처리
            지역과 추가 보유는 각 사업자의 계약·정책, 계정 및 배포 설정에 따릅니다.
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
                    <a href={EXTERNAL_POLICY_URLS.googlePrivacyContact}>개인정보 보호 문의 양식</a>
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
                      오류 내용, 오류 발생 전후 화면 기록, 일반 기기·브라우저 정보와 접속 지역(도시
                      단위)
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
                    <td>
                      오류 심각도 판정과 조치 제안 · 사이트 DB에 목적 달성 또는 삭제 요청 시까지
                    </td>
                    <td>
                      공개 브라우저 오류만 동의 설정에서 끌 수 있음 · 서버 오류는 서비스 운영에
                      필요해 동의와 무관
                    </td>
                  </tr>
                ) : null}
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>Discord Inc. · privacy@discord.com</td>
                    <td>오류 내용과 발생 위치, 배포 환경과 릴리즈, AI 판정 결과</td>
                    <td>미국 · 오류 알림 발생 시 · HTTPS</td>
                    <td>운영자 오류 알림 · 채널에서 삭제할 때까지</td>
                    <td>
                      공개 브라우저 오류만 동의 설정에서 끌 수 있음 · 서버 오류는 서비스 운영에
                      필요해 동의와 무관
                    </td>
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
                {SENTRY_ENABLED ? (
                  <tr>
                    <td>Discord</td>
                    <td>오류 요약과 AI 판정 결과</td>
                    <td>운영자 오류 알림</td>
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
            다만 OpenAI와 Google은 남용 방지 로그를 각 계정 설정과 정책에 따라 제한된 기간 보관할 수
            있습니다. Google Analytics의 광고 개인화와 Google Signals는 사용하지 않습니다. 민감한
            개인정보를 문의나 챗봇에 입력하지 마세요.
          </p>
          {SENTRY_ENABLED ? (
            <p>
              브라우저 오류 수집과 화면 재현은 동의한 뒤에만 시작하며, 화면 재현에서 입력값과 챗봇
              대화 영역은 가려집니다. 서버 오류 로그는 서비스 정상 동작 확인을 위해 동의와 무관하게
              기록하되, 인증 정보·쿠키·요청 본문·방문자 식별 정보를 제거한 오류 내용만 전송합니다.
            </p>
          ) : null}
          {SENTRY_ENABLED ? (
            <p>
              오류 알림의 심각도와 조치를 판정하기 위해 오류 요약을 AI 제공자에게 한 번 더
              전송합니다. 보내는 항목은 오류 제목·유형·메시지, 코드 스택 위치, 배포 환경과 릴리즈로
              한정하며, 접속 주소·요청 헤더·요청 본문·화면 기록·접속 지역과 방문자 식별 정보는
              포함하지 않습니다. 같은 항목과 판정 결과를 Discord 채널로 보내 운영자에게 알리고,
              사이트 데이터베이스에도 기록합니다.
            </p>
          ) : null}
          <p>
            자세한 처리 조건은{" "}
            <a href={EXTERNAL_POLICY_URLS.web3Forms}>Web3Forms 개인정보처리방침</a>,{" "}
            <a href={EXTERNAL_POLICY_URLS.googleAnalytics}>Google Analytics 개인정보 보호 안내</a>,{" "}
            <a href={EXTERNAL_POLICY_URLS.openAi}>OpenAI API 데이터 제어 안내</a>,{" "}
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
};

export { PRIVACY_KO };
