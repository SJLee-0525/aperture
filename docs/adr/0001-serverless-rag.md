# ADR-0001: Vercel Route Handler 기반 Portfolio RAG

## Status

Accepted

## Context

통합 포트폴리오 챗봇은 Photo, Music, Dev의 공개 콘텐츠에서 관련 문맥을 찾아야 한다. 별도 상시 서버와 서비스 계정은 운영하지 않으며 OpenAI 비밀 키는 브라우저에 노출할 수 없다.

## Decision

- 채팅과 임베딩은 Vercel Route Handler에서 실행한다.
- 채팅 키와 임베딩 키·모델·할당량은 환경변수로 분리한다.
- 임베딩 모델은 `text-embedding-3-small`을 사용한다.
- 벡터는 Firestore `ragDocuments`에 저장하고 공개 문서만 런타임 검색에 사용한다.
- 관리자 쓰기는 Firebase ID token과 고정 관리자 UID를 검증한다.
- 최초에는 전체 생성하고 이후에는 변경된 원본 범위만 동기화한다.
- `firebase-admin`과 서비스 계정 키는 사용하지 않는다.
- 일반 Search는 임베딩 없이 로컬 키워드·별칭 검색을 사용한다.

## Consequences

- 별도 서버 비용 없이 Vercel과 Firebase의 사용량 기반 비용만 발생한다.
- 챗봇 질문마다 검색어 임베딩 비용이 발생하지만 일반 Search에는 OpenAI 비용이 없다.
- 콘텐츠 저장 성공과 임베딩 실패는 분리하며, 일괄 갱신을 복구 경로로 유지한다.
- 임베딩 모델이나 청크 규칙을 변경하면 전체 갱신이 필요하다.
