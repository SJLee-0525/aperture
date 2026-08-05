# SEO 배포 후 작업 체크리스트

이 문서는 코드에 이미 구현된 SEO 기능과 배포 후 사이트 소유자가 직접 처리해야 하는 외부 작업을 구분한다.

> Google·네이버에 **처음 등록하는 실행 순서**는 [`search-engine-registration.md`](search-engine-registration.md)를 따른다.
> 이 문서는 구현 항목 목록과 운영 점검 주기를 다루는 레퍼런스다.

## 1. 코드에서 이미 처리되는 항목

- 페이지별 `title`, `description`, canonical URL
- Open Graph 및 X(Twitter) 카드 메타데이터
- `/opengraph-image` 기본 공유 이미지
- `/robots.txt`
  - 공개 페이지 수집 허용
  - `/admin`, `/api` 수집 차단
  - `/sitemap.xml` 위치 안내
- `/sitemap.xml`
  - 주요 공개 페이지
  - 공개 앨범 상세 URL
- `/admin/*`, `/search` 검색 결과 제외
- 이전 사진 URL의 영구 리디렉션
- Google, 네이버 HTML 메타 태그 소유권 인증 환경변수

관련 코드는 다음 위치에서 관리한다.

- `src/app/layout.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/opengraph-image.tsx`
- `src/lib/seo/metadata.ts`
- `src/lib/seo/site-url.ts`

## 2. 배포 전에 반드시 설정할 환경변수

Vercel의 프로젝트 `Settings → Environment Variables`에서 설정한다.

```dotenv
SITE_URL=https://실제-대표-도메인
GOOGLE_SITE_VERIFICATION=
NAVER_SITE_VERIFICATION=
```

### `SITE_URL`

- 최종적으로 검색에 노출할 대표 HTTPS 주소를 입력한다.
- `www` 사용 여부를 확정한 뒤 canonical 주소와 동일하게 설정한다.
- Vercel 임시 도메인이 아니라 실제 운영 도메인을 사용한다.
- 변경 후 반드시 Production을 다시 배포한다.

예:

```dotenv
SITE_URL=https://sungjoonlee.com
```

### 소유권 인증 값

각 서비스가 제공하는 `<meta>` 태그 전체가 아니라 `content` 값만 입력한다.

예:

```html
<meta name="google-site-verification" content="abc123" />
```

```dotenv
GOOGLE_SITE_VERIFICATION=abc123
```

Google의 Domain 속성을 DNS로 인증한다면 `GOOGLE_SITE_VERIFICATION`은 비워도 된다.

## 3. 배포 직후 직접 확인

운영 도메인에서 다음 URL을 시크릿 창으로 열어 모두 `200` 응답인지 확인한다.

```text
https://대표도메인/
https://대표도메인/robots.txt
https://대표도메인/sitemap.xml
https://대표도메인/opengraph-image
```

추가 확인 사항:

- `sitemap.xml` 안의 URL이 `localhost`, Vercel 임시 도메인 또는 이전 도메인이 아닌가
- `robots.txt`의 Sitemap 주소가 운영 도메인인가
- 공개 페이지 소스의 canonical URL이 운영 도메인인가
- `/admin`과 `/search`에 `noindex`가 출력되는가
- 공유 이미지와 페이지 제목·설명이 올바르게 출력되는가

`SITE_URL`이 틀렸다면 검색엔진 등록 전에 먼저 수정하고 재배포한다.

## 4. Google Search Console

1. [Google Search Console](https://search.google.com/search-console/)에 접속한다.
2. 새 속성을 추가한다.
3. 가능하면 **도메인 속성**을 선택한다.
   - `https://`를 제외한 도메인만 입력한다.
   - DNS에 Google이 제공한 TXT 레코드를 추가한다.
   - DNS 레코드는 인증 후에도 삭제하지 않는다.
4. DNS 수정이 어렵다면 **URL 접두어 속성**을 선택한다.
   - Google이 제공한 HTML 태그의 `content` 값을 `GOOGLE_SITE_VERIFICATION`에 넣는다.
   - Production 재배포 후 소유권 확인을 누른다.
5. `Sitemaps` 메뉴에서 다음 주소를 제출한다.

```text
https://대표도메인/sitemap.xml
```

6. URL 검사에서 다음 대표 페이지를 검사하고 색인 생성을 요청한다.
   무-로케일 URL(`/photo` 등)은 308 리디렉션이라 색인 대상이 아니므로 `/ko` 프리픽스를 붙인다.
   - `/ko`
   - `/ko/photo`
   - `/ko/photo/albums`
   - `/ko/music`
   - `/ko/dev/projects`
   - `/ko/contact`
7. 며칠 후 `페이지 색인`, `HTTPS`, `Core Web Vitals` 보고서를 확인한다.

도메인 속성은 모든 프로토콜과 하위 도메인을 함께 관리하며 DNS 인증이 필요하다. URL 접두어 속성은 입력한 프로토콜과 주소 범위만 포함한다. 자세한 내용은 [Google 속성 추가 안내](https://support.google.com/webmasters/answer/34592)와 [소유권 확인 안내](https://support.google.com/webmasters/answer/9008080)를 참고한다.

## 5. 네이버 서치어드바이저

1. [네이버 서치어드바이저](https://searchadvisor.naver.com/)의 웹마스터 도구에 접속한다.
2. 운영 사이트 주소를 등록한다.
3. HTML 태그 인증을 선택한다.
4. `naver-site-verification` 태그의 `content` 값을 `NAVER_SITE_VERIFICATION`에 입력한다.
5. Production을 다시 배포하고 소유 확인을 완료한다.
6. `요청 → 사이트맵 제출`에서 다음 경로를 제출한다.

```text
sitemap.xml
```

7. `검증 → robots.txt`에서 다음을 확인한다.
   - robots.txt 수집 성공
   - 공개 페이지 수집 허용
   - `/admin`, `/api` 수집 차단
   - Sitemap 주소 인식
8. `요청 → 웹 페이지 수집`에서 주요 공개 페이지를 우선 요청한다.
9. `리포트 → 사이트 최적화`와 수집 현황을 주기적으로 확인한다.

네이버는 사이트맵에 수집 대상 URL을 포함하고 소유 확인된 사이트와 동일한 도메인을 사용할 것을 권장한다. [사이트맵 제출 안내](https://searchadvisor.naver.com/guide/request-feed)와 [robots.txt 안내](https://searchadvisor.naver.com/guide/seo-basic-robots)를 참고한다.

## 6. 검색엔진 밖에서 해야 하는 작업

기술 설정만으로 검색 순위가 보장되지는 않는다. 사이트의 신뢰도와 발견 가능성을 위해 다음 작업을 병행한다.

- GitHub 프로필, LinkedIn, Instagram, YouTube 등 본인 프로필에 대표 도메인 연결
- 각 외부 프로필의 이름과 소개 문구를 일관되게 유지
- 프로젝트 저장소 README와 대표 프로젝트 소개에 포트폴리오 링크 추가
- 새 앨범·연주·프로젝트를 공개할 때 해당 상세 URL을 직접 공유
- 이미지에 의미 있는 제목과 대체 텍스트 유지
- 프로젝트 설명, 역할, 성과처럼 검색 가능한 고유 콘텐츠를 지속적으로 보강
- 오래된 링크와 삭제된 콘텐츠의 404 여부를 주기적으로 확인

인위적인 링크 구매, 무관한 사이트에 반복 링크 등록, 같은 키워드 반복 삽입은 하지 않는다.

## 7. 운영 후 점검 주기

### 배포 또는 콘텐츠 변경 직후

- 운영 페이지가 정상 응답하는지 확인
- canonical과 Open Graph 정보 확인
- 새 앨범 URL이 sitemap에 포함됐는지 확인
- 중요한 신규 URL은 Google과 네이버에서 수집 요청

### 주 1회

- Search Console과 서치어드바이저의 수집·색인 오류 확인
- 404, 리디렉션, 서버 오류 확인

### 월 1회

- 검색 노출수, 클릭수, 검색어 확인
- 노출은 있지만 클릭률이 낮은 페이지의 제목·설명 개선
- 색인되지 않은 공개 페이지의 robots, noindex, canonical 확인
- Core Web Vitals와 모바일 사용성 확인

## 8. 자주 발생하는 문제

### 소유권 인증 실패

- 메타 태그 전체가 아니라 `content` 값만 환경변수에 넣었는지 확인
- 환경변수 설정 후 Production을 다시 배포했는지 확인
- 페이지 소스에서 인증 메타 태그를 검색
- Vercel Preview가 아니라 운영 도메인을 확인

### 사이트맵에 잘못된 도메인이 표시됨

- `SITE_URL` 확인
- `https://` 포함 여부 확인
- Production 재배포
- CDN 반영 후 `/sitemap.xml` 다시 확인

### 페이지가 검색에 나오지 않음

- 신규 사이트는 수집과 색인에 시간이 필요하다.
- Search Console URL 검사에서 실제 색인 상태와 원인을 확인한다.
- robots.txt 수집 차단, `noindex`, 잘못된 canonical 여부를 확인한다.
- 사이트맵 제출은 색인을 보장하지 않으며 검색엔진이 최종 색인 여부를 결정한다.

### 공유 이미지가 이전 버전으로 보임

- SNS와 메신저가 Open Graph 결과를 별도로 캐시할 수 있다.
- 운영 `/opengraph-image`가 최신인지 먼저 확인한다.
- 해당 서비스의 공유 디버거 또는 캐시 갱신 기능이 있다면 다시 수집을 요청한다.
