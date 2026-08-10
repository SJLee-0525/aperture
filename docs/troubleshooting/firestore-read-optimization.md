# Firestore 공개 읽기 최적화

## 배경

공개 페이지는 Next.js App Router의 정적 생성과 1시간 ISR을 사용하지만, `photos`·`albums`·`musicWorks` 같은 같은 Firestore 컬렉션을 여러 경로가 각자 조회했다. 페이지 출력은 경로별로 캐시되었지만 Firestore `runQuery` 결과는 경로 사이에서 공유되지 않았다.

관리자가 콘텐츠를 저장할 때는 루트 layout 전체를 무효화했다. 이후 헤더와 목록의 Next.js Link prefetch가 여러 경로를 미리 생성하면, 사용자가 열지 않은 화면까지 같은 문서를 반복해 읽을 수 있었다.

## 목표

- 동일한 공개 쿼리 결과를 여러 페이지가 공유한다.
- CMS 저장 후 변경된 데이터에 의존하는 캐시만 무효화한다.
- 저장 결과는 첫 공개 조회부터 즉시 반영한다.
- 사용자가 열지 않은 데이터 중심 페이지를 배경에서 미리 생성하지 않는다.

## 적용 내용

### 1. Firestore Data Cache

`src/lib/firebase/public/transport.ts`의 공개 REST 읽기에 1시간 `revalidate` 설정과 캐시 태그를 적용했다.

- 목록 쿼리: `firestore:<collectionId>`
- 단일 문서: `firestore:<collectionId>:<documentId>`

예를 들어 `/photo`, `/photo/map`, `/photo/about`, `/photo/albums`가 같은 `photos` 쿼리를 사용해도 Data Cache가 유효한 동안은 Firestore 결과를 공유한다. 캐시 키에는 URL, HTTP method, POST body가 포함되므로 같은 컬렉션의 전체 목록과 필드 projection 쿼리는 서로 다른 결과로 캐시된다.

Firestore projection은 네트워크 응답 크기를 줄이지만 문서 읽기 수를 줄이지는 않는다. 읽기 수 절감은 projection이 아니라 이 공유 캐시에서 발생한다.

### 2. 변경 범위별 무효화

전체 `revalidatePath("/", "layout")`를 제거하고 쓰기 경로가 자신이 변경한 캐시 태그를 전달하도록 바꿘었다.

| 작업                              | 무효화 태그                            |
| --------------------------------- | -------------------------------------- |
| 사진 생성·수정·정렬·공개 변경     | `firestore:photos`                     |
| 사진 삭제                         | `firestore:photos`, `firestore:albums` |
| 앨범 변경                         | `firestore:albums`                     |
| 연주·수상·영상·개발 프로젝트 변경 | 해당 컬렉션 태그                       |
| 전역·음악·개발 설정 변경          | 해당 `site` 문서 태그                  |

사진 삭제는 앨범의 `photoIds`와 `coverPhotoId`도 바꾸므로 두 컬렉션을 함께 무효화한다. 드래그 정렬처럼 짧은 시간에 여러 문서를 쓰는 작업은 300ms 동안 태그를 `Set`에 모아 Server Action을 한 번만 호출한다.

### 3. 즉시 반영과 낮은 재조회 비용

검증된 Server Action은 콘텐츠 태그에 `updateTag`를 사용한다. 이로써 무효화 후 첫 요청이 이전 결과를 받는 stale-while-revalidate 구간 없이 새 Firestore 결과를 기다린다. 쿼리당 재조회는 한 번이며 이후 공유 캐시를 재사용하므로 `revalidateTag(..., "max")`와 비교해 Firestore 읽기 수가 의미 있게 늘지 않는다.

챗봇 프로필 스냅샷은 즉시 표시보다 중복 재생성 억제가 중요하므로 기존 `revalidateTag(..., "max")`를 유지한다.

### 4. 선택적 자동 prefetch

랜딩의 3개 진입점, 전역 헤더와 모바일 탭은 핵심 탐색 경로이며 링크 수가 제한적이므로 Next.js 기본 prefetch를 유지한다. 공유 Data Cache가 있어 이 경로들이 같은 컬렉션을 읽어도 캐시 주기 내 중복 Firestore 조회는 줄어든다.

반면 앨범 카드, 통합 검색 결과, 챗봇 참조 링크처럼 개수가 콘텐츠에 따라 늘어나는 목록은 `prefetch={false}`를 유지한다. 방문하지 않은 상세 경로까지 대량으로 미리 생성하지 않기 위한 균형점이다.

## 예상 효과

- 동일한 컬렉션을 쓰는 여러 페이지의 최초 읽기를 캐시 주기 내 1회로 공유한다.
- 한 영역의 CMS 저장이 관계없는 영역의 Firestore 재조회를 유발하지 않는다.
- 링크가 많은 콘텐츠 목록은 방문하지 않은 상세 경로의 캐시를 대량으로 데우지 않는다.

절감률은 문서 수, 방문 경로, CMS 저장 빈도에 따라 달라지므로 코드만으로 특정 수치를 보장하지 않는다.

## 검증

- Firestore REST 조회에 예상한 `revalidate`와 태그가 전달되는지 Vitest로 검증
- 관리자 인증 실패 시 어떤 태그도 무효화하지 않는지 검증
- 중복 태그가 한 번만 `updateTag`에 전달되는지 검증
- TypeScript, ESLint, 전체 Vitest, mock 콘텐츠 프로덕션 빌드 통과

## 운영 확인

배포 전·후 Firebase Console에서 Firestore `Document Reads`를 24~48시간 단위로 비교한다. 비교 기간의 트래픽과 CMS 작업 횟수가 비슷한지 함께 확인해야 한다.

배포 후에는 다음 시나리오를 점검한다.

1. 사진 제목을 수정한 뒤 첫 `/photo` 접속에서 새 제목이 보인다.
2. 사진을 삭제한 뒤 사진 목록과 해당 앨범 모두에서 사라진다.
3. 음악 콘텐츠를 저장한 뒤 사진 페이지를 열어도 `photos` 재조회가 발생하지 않는다.
4. 랜딩·헤더 이동은 prefetch를 사용하고, 앨범·검색·챗봇의 대량 결과 링크는 자동 prefetch하지 않는다.
