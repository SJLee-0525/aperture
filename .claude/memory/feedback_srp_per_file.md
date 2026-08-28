# 사용자 선호: 파일당 단일 책임 (SRP)

> alphaLetterTest 프로젝트에서 이관 (2026-05-08 도출, 2026-06-12 본 프로젝트 적용).

## What

사용자는 **파일당 단일 책임 원칙(SRP)** 을 강하게 선호. 한 파일에 여러 함수·클래스 묶지 말고 가능한 한 **1 파일 = 1 책임**으로 분리할 것.

## Why

- "이 파일은 무엇을 하는가"를 **파일명만으로** 알 수 있어야 함
- 코드 검색 / 수정 / 리뷰 비용 최소화

## How to apply (이 프로젝트 디폴트)

- 디렉토리 트리 / 새 파일 제안 시 **디폴트로 잘게 쪼갠 형태**로 제시
- `utils.ts` / `helpers.ts` / `common.ts` 같은 잡탕 파일 금지
- 파일명은 그 파일의 단일 책임을 그대로 표현 (예: `GalleryGrid.tsx`, `use-auth.ts`)

## 예외 (묶는 게 더 명확한 케이스 — 이 프로젝트 버전)

1. **Supabase 경계** — `lib/supabase/` 안에서 **관심사별 1파일**로 나누되, 함께 바뀌는 요청 조립과 응답 해석은 한 모듈에 둔다.
2. **타입 정의** — 같은 엔티티의 타입 변형(Photo / PhotoDraft 등)은 `types/photo.ts` 한 파일.
3. **상수** — `constants/collections.ts` 처럼 도메인별 1파일.
4. **내보내기 프레임 렌더** — 프레임 6종을 `features/export/frame-preview.ts` 한 파일에 모음 (분산 시 프레임 간 일관성 파악 어려움).

## 위반 사례 (체크리스트)

- [ ] `utils.ts` / `helpers.ts` / `common.ts` 잡탕 파일 생성 → 금지
- [ ] 한 컴포넌트 파일에 Grid + Lightbox + Uploader 동거 → 분리
- [ ] hook 하나에 인증 + 데이터 페칭 혼합 → use-auth / use-photo-filter 분리
