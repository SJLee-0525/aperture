# 프로젝트 결정: Aperture. 사진 포트폴리오 — 스택·정체성·핵심 기능

기록: 2026-06-12 (스택 선택), **2026-07-01 갱신** (연주자→사진 포트폴리오 전환 그릴링에서 확정), **2026-08-29 갱신** (Supabase 이전·Firebase 해체 완료).

## 스택 결정

- **Next.js (App Router) + Supabase (Auth + Postgres + Storage) + Vercel Hobby**
- 별도 백엔드 서버 없음. 공개 읽기는 PostgREST, 인증된 쓰기의 보안 경계는 RLS다.
- **스타일 = CSS Modules + CSS 변수** (Tailwind 미사용 — 디자인 export 가 순수 CSS라 재작성 세금 회피 + SRP)
- **i18n = 자체 구현** (`useSyncExternalStore` + `pickText` 폴백), **ko/en** (de 없음)

## Why (스택)

1. 사용자가 **Supabase 무료 DB 의 7일 무활동 일시정지를 거부** → Firestore 는 정지 없음. **(2026-08-15 재결정으로 뒤집힘 — 아래 「재결정」 참조)**
2. 관리자 1명 + 방문자 구조라 상시 서버 불필요. 월 $0 목표.
3. Firebase Storage용 Blaze와 카드 등록은 2026-08-29 Firebase 프로젝트 해체로 종료했다.
   지도는 MapLibre+CARTO 무료 타일을 유지한다.

## 재결정 (2026-08-15): 데이터 계층을 Supabase 로 이전

- Firestore 읽기 한도(5만/일)가 실사용에서 소진되어(주범: 관리자 저장마다 RAG 스냅샷 캐시 무효화 → 챗 질문당 285문서 재조회) 위 Why 1번 트레이드오프를 재평가했다.
- 7일 무활동 일시정지는 수용한다: ISR 이 재생성 실패 시 기존 캐시를 유지해 공개 페이지는 stale 로 살아 있고, GitHub Actions keep-alive(주 2회, Supabase API 직접 호출)로 정지를 막는다.
- 측정(2026-08, 15일 사용): Storage 68.42MB · 객체 735개 · 전송 1.56GB(월 환산 약 3GB) · 요청 2.6만 → Supabase 무료 한도(Storage 1GB, egress 월 10GB) 내.
- 결정·범위는 `docs/adr/0005-supabase-migration.md`, 실행 계획은 `docs/plan/08-supabase-migration.md`. 관리자 판별은 UID 하드코딩에서 `app_metadata.role="admin"` 클레임으로 변경.
- 2026-08-29 2주 관찰, 암호화 백업, 빈 프로젝트 실제 복구와 운영 재검증을 마치고 Firebase
  Auth·Storage·프로젝트를 삭제했다. 복구 기준은 Backblaze B2의 검증된 Supabase
  `post-restore-drill` 백업이다.

## 프로젝트 정체성 (2026-07-01 확정)

- **Aperture.** — 사진작가 **이성준(Sungjoon Lee)** 의 개인 사진 포트폴리오 (개인적으로 찍은 사진).
- 이전 스캐폴드의 "연주자 김준형" 은 **다른 프로젝트(`C:\github\jh-portfolio`)** 것. `.claude` 틀·컨벤션만 계승, 내용은 사진용으로 전면 교체.
- **jh-portfolio 는 이 틀의 원본이자 이식 참고처** — i18n·테마 "지고 뜨는" 애니메이션·토글의 **로직**을 여기서 가져온다 (jh 는 Tailwind, 우리는 CSS Modules → 로직만).

## 핵심 기능 결정 (그릴링 확정)

- **데이터 모델**: `photos` / `albums` / `site(config)`. 영상·음원 없음(정지 이미지 전용).
- **태그 = 통제 사전** (`site/config.tags` 에 `{id,ko,en}`), 사진은 id 참조. 카메라·초점거리 필터는 EXIF 파생.
- **정렬 = 수동 `order` 필드 + dnd-kit 드래그** (날짜 정렬 아님 — **큐레이션 우선**이 사용자 결정).
- **이미지**: `exifr` 로 **압축 前** EXIF·GPS 추출 → webp ~2048px 압축. **원본 미보관.** GPS 없으면 지도 클릭 수동 좌표.
- **쓰기 보안**: 익명 쓰기 기능은 제거. Postgres RLS와 Storage 정책은
  `app_metadata.role="admin"`인 사용자에게만 쓰기를 허용한다.
- **지도**: **MapLibre GL + CARTO 무료 타일**(Positron/Dark Matter, 테마 연동). 키·카드 없음, `/map` 에서만 dynamic 로드(ssr:false). (Google Maps는 카드·비용 이슈로 기각 — 2026-07-02)
- **내보내기**: 클라이언트 canvas 프레임 6종 → webp, 저장 해상도(원본 옵션 제거).
- **AI 태그 추천**: **Phase 3**, **브라우저 내 `transformers.js` CLIP zero-shot 만** (클라우드 비전/LLM API 는 시크릿 키·서버 필요 → 아키텍처상 금지).

## 미확정

- 호스팅: Vercel.
- 신규 문서 `order` 부여 정책(맨 앞 vs 맨 뒤) — frontend 와 협의.
