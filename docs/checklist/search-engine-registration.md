# 검색엔진 등록 절차 (Google · Naver)

`sungjoon.works` 를 Google·네이버 검색에 노출시키는 **실행 순서**다.
`GOOGLE_SITE_VERIFICATION` · `NAVER_SITE_VERIFICATION` 두 값을 채우는 게 핵심이다.

코드에 이미 구현된 SEO 기능 목록과 운영 점검 주기는
[`seo-launch-checklist.md`](seo-launch-checklist.md)를 본다.

Bing은 쓰지 않기로 해서 코드·문서에서 제외했다. 나중에 필요하면
Bing Webmaster Tools의 `Import from Google Search Console` 로 Google 속성을 그대로 가져오는 게 가장 빠르다.

- 실작업: 30분
- 색인 대기: 3일 ~ 2주

> 명령은 전부 **PowerShell** 기준이다. PowerShell의 `curl`은 `Invoke-WebRequest` 별칭이라
> `-s` 같은 옵션을 못 알아듣는다. 진짜 curl을 쓰려면 `curl.exe` 로 `.exe`를 붙인다.

---

## 0. 선행 조건 — 먼저 배포해야 한다

⚠️ **경로 기반 i18n(`/ko`·`/en`) 전환이 아직 프로덕션에 배포되지 않았다면 여기서 멈춘다.**

현재 코드는 공개 URL이 전부 `/ko/*`·`/en/*` 이고 무-로케일 URL은 308로 리다이렉트된다.
구버전이 떠 있는 상태로 검색엔진에 등록하면 **옛 URL(`/photo`)이 색인되고, 배포 후 전부 무효**가 되어
색인을 처음부터 다시 받아야 한다.

배포 상태 확인:

```powershell
# 신규 로케일 라우트가 살아 있는가 (200 이어야 정상)
(iwr https://sungjoon.works/ko -SkipHttpErrorCheck).StatusCode

# 무-로케일 URL이 리다이렉트되는가 (308 이어야 정상)
(iwr https://sungjoon.works/photo -MaximumRedirection 0 -SkipHttpErrorCheck).StatusCode
```

`/ko` 가 404거나 `/photo` 가 200이면 구버전이다. 배포부터 한다.

체크:

- [ ] `main` 의 로컬 커밋이 전부 push 됐는가 (`git log --oneline origin/main..HEAD` 가 비어야 함)
- [ ] Vercel Production 배포가 최신 커밋으로 성공했는가
- [ ] `https://sungjoon.works/ko` 가 200인가

---

## 1. `SITE_URL` 확인

canonical·hreflang·`robots.txt`·`sitemap.xml` 의 절대 URL 기준이다.
**틀린 채로 등록하면 이후 단계가 전부 헛수고**이므로 소유확인보다 먼저 잡는다.

Vercel → `Settings → Environment Variables` → Production:

```dotenv
SITE_URL=https://sungjoon.works
```

- 프로토콜(`https://`) 포함. 끝의 `/` 는 있어도 없어도 된다.
- 미설정 시 `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` 순으로 폴백한다
  (`src/lib/seo/site-url.ts`). 즉 **비워두면 조용히 `*.vercel.app` 이 박힌다.**
- 환경변수는 빌드 타임에 메타데이터로 구워진다 → **저장만으로는 반영 안 되고 재배포 필요.**

검증:

```powershell
irm https://sungjoon.works/robots.txt
(irm https://sungjoon.works/sitemap.xml).urlset.url | Select-Object -First 6 -ExpandProperty loc
```

기대 출력:

```text
User-Agent: *
Allow: /
Disallow: /admin
Disallow: /api

Sitemap: https://sungjoon.works/sitemap.xml
```

```text
https://sungjoon.works/ko
https://sungjoon.works/en
https://sungjoon.works/ko/photo
https://sungjoon.works/en/photo
https://sungjoon.works/ko/photo/albums
https://sungjoon.works/en/photo/albums
```

- URL에 `localhost` / `*.vercel.app` 이 섞이면 `SITE_URL` 문제다.
- `/ko`·`/en` 프리픽스가 **없으면 구버전 배포**다. 0단계로 돌아간다.

---

## 2. Google Search Console

[Google Search Console](https://search.google.com/search-console/) → 속성 추가.

### 방법 A — 도메인 속성 (권장)

- 입력: `sungjoon.works` (`https://` 없이 도메인만)
- Google이 주는 **TXT 레코드**를 도메인 등록처 DNS에 추가 → `확인`
- http/https, www 유무, 하위 도메인을 한 번에 커버
- **`GOOGLE_SITE_VERIFICATION` 은 비워둬도 된다**
- TXT 레코드는 인증 후에도 삭제하지 않는다 (삭제 시 소유권 해제)

> 이 방식을 권하는 이유: 이 사이트는 `/` → `/ko` 로 **308 리다이렉트**한다(`next.config.ts`).
> URL 접두어 + meta 태그 방식은 루트가 리다이렉트되면 확인에 실패할 수 있다.
> DNS를 만질 수 있으면 도메인 속성이 확실하다.

### 방법 B — URL 접두어 속성 (DNS를 못 만질 때)

- 입력: `https://sungjoon.works`
- 확인 방법에서 **HTML 태그** 선택
- 태그 전체가 아니라 `content` 값만 복사한다

  ```html
  <meta name="google-site-verification" content="abc123..." />
  ```

  → `abc123...` 부분만

- **아직 `확인` 버튼을 누르지 말고 4단계로 간다.**

메모해 둘 값:

```dotenv
GOOGLE_SITE_VERIFICATION=여기에-content-값
```

---

## 3. 네이버 서치어드바이저

[네이버 서치어드바이저](https://searchadvisor.naver.com/) → 웹마스터 도구 → 사이트 등록.

1. `https://sungjoon.works/` 입력

2. 소유확인 방법 선택

   **방법 A — HTML 파일 업로드 (권장)**

   - `naverXXXXXXXX.html` 파일을 받아 저장소 `public/` 에 그대로 넣는다
   - 커밋 → 배포 → 확인:

     ```powershell
     (iwr https://sungjoon.works/naverXXXXXXXX.html -SkipHttpErrorCheck).StatusCode   # 200
     ```

   - `public/` 정적 파일은 로케일 리다이렉트 대상이 아니라서 안전하다
   - 이 방식을 쓰면 `NAVER_SITE_VERIFICATION` 은 비워둬도 된다

   **방법 B — HTML 태그**

   - `naver-site-verification` 태그의 `content` 값만 복사

     ```dotenv
     NAVER_SITE_VERIFICATION=여기에-content-값
     ```

   - 루트가 `/ko` 로 리다이렉트되므로 실패하면 방법 A로 갈아탄다

3. **소유확인 버튼은 4단계 배포 이후에** 누른다.

---

## 4. 환경변수 등록 + 재배포 (한 번에)

Google·Naver 값을 모아서 **한 번만** 배포한다.

1. Vercel → `Settings → Environment Variables` → **Production**

   ```dotenv
   GOOGLE_SITE_VERIFICATION=
   NAVER_SITE_VERIFICATION=
   ```

   - 둘 다 `NEXT_PUBLIC_` 접두사가 **없는 서버 전용 변수**다. 그대로 둔다.
   - `content` 속성값만 넣는다. `<meta ...>` 태그 전체를 넣으면 실패한다.
   - DNS 인증(2-A) / HTML 파일(3-A)을 쓴 쪽은 해당 변수를 비워둔다.

2. Production 재배포.

3. 메타 태그가 실제로 나오는지 확인:

   ```powershell
   $h = (iwr https://sungjoon.works/ko).Content
   [regex]::Matches($h, '<meta name="[^"]*site-verification"[^>]*>') | % { $_.Value }
   ```

   기대 출력:

   ```html
   <meta name="google-site-verification" content="..." />
   <meta name="naver-site-verification" content="..." />
   ```

   안 보이면 → 재배포가 안 됐거나, Preview 환경에만 변수를 넣었거나, 태그 전체를 붙여넣은 것이다.

---

## 5. 소유확인 실행

- Google Search Console → `확인`
- 네이버 서치어드바이저 → `소유확인`

둘 다 통과해야 다음으로 간다.

---

## 6. 사이트맵 제출

**Google** — `Sitemaps` 메뉴에 입력:

```text
sitemap.xml
```

**네이버** — `요청 → 사이트맵 제출`:

```text
sitemap.xml
```

상태가 `성공`/`가져옴` 이 되기까지 수 시간~하루 걸린다.

이어서 **네이버 `검증 → robots.txt`** 를 실행해 확인한다.

- robots.txt 수집 성공
- 공개 페이지 수집 허용, `/admin`·`/api` 차단
- Sitemap 주소 인식

---

## 7. 주요 페이지 색인 요청

⚠️ `/photo` 같은 무-로케일 URL은 **308 리다이렉트라 색인 대상이 아니다.**
반드시 `/ko` 프리픽스가 붙은 실제 URL로 요청한다.

```text
https://sungjoon.works/ko
https://sungjoon.works/ko/photo
https://sungjoon.works/ko/photo/albums
https://sungjoon.works/ko/music
https://sungjoon.works/ko/dev/projects
https://sungjoon.works/ko/contact
```

- **Google**: 상단 `URL 검사` → 주소 입력 → `색인 생성 요청`
- **네이버**: `요청 → 웹 페이지 수집`

영어 페이지(`/en/*`)는 sitemap과 hreflang으로 함께 발견되므로 개별 요청하지 않아도 된다.

---

## 8. 기대 타임라인

| 시점   | 상태                                                  |
| ------ | ----------------------------------------------------- |
| 즉시   | 소유확인 완료, 사이트맵 접수                          |
| 1~3일  | 사이트맵 처리 완료, 랜딩 페이지 색인                  |
| 1~2주  | 주요 하위 페이지 색인, Search Console에 검색어 데이터 |
| 1개월+ | 이름 검색(`이성준 포트폴리오` 등)으로 노출 시작       |

사이트맵 제출이 색인을 **보장하지는 않는다.** 색인 여부는 검색엔진이 최종 결정한다.

---

## 9. 안 될 때

| 증상                      | 확인할 것                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| 소유확인 실패             | `content` 값만 넣었는가 / 재배포했는가 / Production 환경인가 / 4단계 `regex` 명령으로 태그 보이는가 |
| 루트 URL 확인 실패        | `/` → `/ko` 308 때문. Google=도메인 속성(DNS), 네이버=HTML 파일 업로드로 전환                       |
| sitemap이 `*.vercel.app`  | `SITE_URL` 미설정 → 1단계 재실행 후 재배포                                                          |
| sitemap에 `/ko` 없음      | 구버전 배포 → 0단계                                                                                 |
| 사이트맵 `가져올 수 없음` | `https://sungjoon.works/sitemap.xml` 이 200인지, 소유확인한 도메인과 같은지                         |
| 색인 안 됨                | URL 검사에서 사유 확인 → `noindex`·canonical·robots 차단 여부                                       |

---

## 10. 등록 이후

[`seo-launch-checklist.md`](seo-launch-checklist.md) §6~§8(외부 링크 확보, 점검 주기, 트러블슈팅)로 이어진다.

새 앨범·프로젝트를 공개하면 sitemap에 자동 반영되지만, 중요한 URL은 색인 요청을 직접 넣는 게 빠르다.

---

## 부록 — 배포 후 일괄 점검 스크립트

```powershell
$base = "https://sungjoon.works"

"=== robots.txt ==="
irm "$base/robots.txt"

"`n=== sitemap URL 수 ==="
$sm = irm "$base/sitemap.xml"
"총 $($sm.urlset.url.Count) 개"
$sm.urlset.url | Select-Object -First 4 -ExpandProperty loc

"`n=== verification / canonical / hreflang ==="
$h = (iwr "$base/ko").Content
[regex]::Matches($h, '<meta name="[^"]*site-verification"[^>]*>') | % { $_.Value }
[regex]::Matches($h, '<link rel="(canonical|alternate)"[^>]*>')   | % { $_.Value }

"`n=== 리다이렉트 / noindex ==="
foreach ($p in @('/', '/photo', '/albums', '/map')) {
  $r = iwr "$base$p" -MaximumRedirection 0 -SkipHttpErrorCheck
  "{0,-10} -> {1}" -f $p, $r.StatusCode      # 전부 308 이어야 정상
}
$a = (iwr "$base/admin" -SkipHttpErrorCheck).Content
[regex]::Matches($a, '<meta name="robots"[^>]*>') | % { $_.Value }
```

기대 결과 (2026-08-05 로컬 검증 기준):

- sitemap 총 URL 수 = (공개 라우트 14 + 공개 앨범 수) × 2
- canonical `https://sungjoon.works/ko`, hreflang `ko`·`en`·`x-default` 3종
- `/`, `/photo`, `/albums`, `/map` 전부 308
- `/admin` 에 `noindex, nofollow, noarchive, nocache`
