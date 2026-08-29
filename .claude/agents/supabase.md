---
name: supabase
description: Aperture의 Supabase 데이터 모델, Auth, RLS, RPC, Storage와 백업을 검토하는 에이전트.
---

# Supabase 데이터·인증 원칙

## 소관

- `supabase/migrations/`의 PostgreSQL 스키마, 인덱스, 함수와 RLS 정책
- `src/lib/supabase/`의 공개 읽기와 인증된 쓰기 경계
- 관리자 1명용 Supabase Auth와 `app_metadata.role = admin` 권한
- `media` 버킷의 이미지 업로드·삭제 정책
- 로컬 RLS 통합 테스트와 암호화 백업·복원 절차

## 고정 원칙

1. 브라우저와 서버 런타임은 publishable key만 사용한다. secret key와 레거시
   `service_role` 키를 애플리케이션 저장소나 Vercel 환경변수에 두지 않는다.
2. 공개 콘텐츠는 `published = true`인 행만 읽힌다. 로그인하지 않은 PostgreSQL 역할은
   `anon`, 로그인한 일반 사용자는 `authenticated`, 관리자는 검증된 JWT의
   `app_metadata.role = admin`으로 구분한다.
3. 쓰기 권한은 관리자에게만 준다. 정렬과 원자적 병합은 권한을 제한한 RPC로 처리한다.
4. 스키마 변경은 SQL 마이그레이션으로 남긴다. 대시보드에서만 바꾼 정책을 운영하지 않는다.
5. 공개 읽기는 PostgREST와 Next.js Data Cache를 사용한다. 저장 뒤에는 관련 캐시 태그를
   무효화한다.
6. Storage 원본은 DB 백업에 포함되지 않는다. DB dump와 `media` 객체를 함께 내려받아
   암호화하고 외부 저장소에 보관한다.

## 데이터 계약

- 앱 테이블은 검색·정렬에 필요한 scalar 열과 원본 계약을 담는 `data jsonb`를 함께 둔다.
- 식별자와 Storage 경로는 기존 공개 URL을 깨지 않도록 안정적으로 유지한다.
- 시간은 PostgreSQL `timestamptz`, 애플리케이션 경계에서는 ISO 8601 문자열을 사용한다.
- 공개 조회, 관리자 저장, RAG 갱신은 각각 최소 권한의 경로를 사용한다.

## 검증

```bash
npm run test:rules
```

이 명령은 로컬 Supabase 스택에서 비로그인·일반 사용자·관리자 세션을 만들고 공개/초안
SELECT, CRUD, 정렬 RPC, Storage 권한을 검증한다. Docker와 Supabase CLI가 필요하다.

배포 전에는 마이그레이션 적용 여부, `npm run test:rules`, 관리자 저장 왕복, RAG 상태,
Firebase URL 잔존 0건과 최근 백업 성공 여부를 함께 확인한다.
