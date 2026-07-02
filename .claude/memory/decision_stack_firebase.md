# 프로젝트 결정: Aperture. 사진 포트폴리오 — 스택·정체성·핵심 기능

기록: 2026-06-12 (스택 선택), **2026-07-01 갱신** (연주자→사진 포트폴리오 전환 그릴링에서 확정).

## 스택 결정

- **Next.js (App Router) + Firebase (Auth + Firestore + Storage) + Vercel Hobby**
- 별도 백엔드 서버 없음. Security Rules 가 보안 경계.
- **스타일 = CSS Modules + CSS 변수** (Tailwind 미사용 — 디자인 export 가 순수 CSS라 재작성 세금 회피 + SRP)
- **i18n = 자체 구현** (`useSyncExternalStore` + `pickText` 폴백), **ko/en** (de 없음)

## Why (스택)

1. 사용자가 **Supabase 무료 DB 의 7일 무활동 일시정지를 거부** → Firestore 는 정지 없음.
2. 관리자 1명 + 방문자 구조라 상시 서버 불필요. 월 $0 목표.
3. 트레이드오프: **Storage** 위해 Blaze 전환 + 카드 등록 (무료 한도 내 $0, 예산 알림 $1). 지도는 MapLibre+CARTO 무료 타일이라 결제 표면은 **Firebase 하나뿐**.

## 프로젝트 정체성 (2026-07-01 확정)

- **Aperture.** — 사진작가 **이성준(Sungjoon Lee)** 의 개인 사진 포트폴리오 (개인적으로 찍은 사진).
- 이전 스캐폴드의 "연주자 김준형" 은 **다른 프로젝트(`C:\github\jh-portfolio`)** 것. `.claude` 틀·컨벤션만 계승, 내용은 사진용으로 전면 교체.
- **jh-portfolio 는 이 틀의 원본이자 이식 참고처** — i18n·테마 "지고 뜨는" 애니메이션·토글의 **로직**을 여기서 가져온다 (jh 는 Tailwind, 우리는 CSS Modules → 로직만).

## 핵심 기능 결정 (그릴링 확정)

- **데이터 모델**: `photos` / `albums` / `site(config)`. 영상·음원 없음(정지 이미지 전용).
- **태그 = 통제 사전** (`site/config.tags` 에 `{id,ko,en}`), 사진은 id 참조. 카메라·초점거리 필터는 EXIF 파생.
- **정렬 = 수동 `order` 필드 + dnd-kit 드래그** (날짜 정렬 아님 — **큐레이션 우선**이 사용자 결정).
- **이미지**: `exifr` 로 **압축 前** EXIF·GPS 추출 → webp ~2048px 압축. **원본 미보관.** GPS 없으면 지도 클릭 수동 좌표.
- **좋아요**: 익명 **+1 전용** 공개 카운트, `likes≥1` 빨강. Rules delta-guard = **유일하게 허용된 무인증 쓰기**.
- **지도**: **MapLibre GL + CARTO 무료 타일**(Positron/Dark Matter, 테마 연동). 키·카드 없음, `/map` 에서만 dynamic 로드(ssr:false). (Google Maps는 카드·비용 이슈로 기각 — 2026-07-02)
- **내보내기**: 클라이언트 canvas 프레임 6종 → webp, 저장 해상도(원본 옵션 제거).
- **AI 태그 추천**: **Phase 3**, **브라우저 내 `transformers.js` CLIP zero-shot 만** (클라우드 비전/LLM API 는 시크릿 키·서버 필요 → 아키텍처상 금지).

## 미확정

- 호스팅: Vercel 가정 (Firebase Hosting 대안 열림).
- 신규 문서 `order` 부여 정책(맨 앞 vs 맨 뒤) — frontend 와 협의.
