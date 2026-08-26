# 정확성

여기 있는 항목은 전부 실행 경로를 끝까지 따라가 확인한 것이다. "이 코드는 이상해 보인다"가 아니라 "어떤 입력이 들어오면 어떤 값이 나온다"까지 내려간 것만 남겼고, 그 과정에서 처음 보고된 20건 중 1건은 도달 경로가 없다는 이유로 빠졌다(`splitOversized` 의 빈 문자열 push 는 상류의 `normalizeWhitespace` 가 선두 공백을 지우기 때문에 발생하지 않는다). 몇몇 항목은 줄번호와 실측 수치를 다시 재서 정정했다.

목록은 세 덩어리다. 지금 이 순간 잘못 동작하는 것, 특정 조건이 겹칠 때만 잘못 동작하는 것, 코드에는 결함이 있지만 아직 그 경로에 아무도 도달하지 않는 것. 이 구분이 곧 착수 순서다. 첫 덩어리 3건은 방문자나 데이터가 이미 영향을 받고 있고, 두 번째 덩어리는 조건이 흔하거나(긴 대화, 다른 타임존) 결과가 무겁다(영구 삭제, 챗 전역 차단). 세 번째 덩어리는 대부분 한 줄 수정이고 지금 고치는 값은 나중에 조사 시간을 아끼는 것뿐이다.

테스트가 이것들을 통과시킨 이유는 대체로 하나로 모인다. fixture 가 현실보다 얌전하다. 프로필 문맥 테스트의 문자열은 전부 한 줄이고, 챗 스키마 테스트는 ASCII 라 한 글자가 1바이트이며, 이미지 정리 테스트는 모든 파일에 업로드 시각이 있고, no-flash 스크립트 테스트는 경로 기반 i18n 이전의 URL 로만 검증한다. 여기에 환경의 한계가 겹친다. jsdom 에는 레이아웃이 없어 `offsetParent` 가 늘 `null` 이고, 그래서 포커스 트랩의 가시성 판정 결함은 단위 테스트로는 재현 자체가 불가능하다. 마지막 표에 어떤 테스트가 왜 통과시켰는지 정리했다.

## 지금 잘못 동작한다

### 높음 1. 첫 페인트의 섹션 색이 항상 파랑이다

위치는 `src/features/theme/_lib/theme-script.ts:12`.

no-flash 인라인 스크립트가 `location.pathname` 을 `SECTION_BY_PREFIX`(`src/constants/sections.ts:10-18`)의 키와 직접 비교한다. 키는 `/photo`, `/music`, `/dev`, `/contact` 같은 무-로케일 프리픽스다. 그런데 ADR-0002 이후 공개 URL 은 전부 `/ko/*`·`/en/*` 이므로 `path.indexOf("/music/") === 0` 이 성립하는 경로가 없다. 루프가 통째로 빠지고 `document.documentElement.dataset.section` 은 폴백인 `home` 이 된다. 같은 판정을 하는 `sectionFromPath`(`sections.ts:30-36`)는 `stripLangPrefix` 를 거치는데, 스크립트는 그 루프를 복제하면서 이 한 단계를 빠뜨렸다.

node 로 스크립트 루프를 그대로 돌려 확인한 결과는 이렇다. `/ko/music` 은 `home`, `/en/dev/projects` 는 `home`, `/ko/contact` 는 `home`, `/ko/photo` 도 `home` 이다. 맞히는 경로는 `/music` 처럼 로케일이 없는 URL 뿐인데, 그 URL 은 `next.config.ts:60-69` 가 308 로 튕기므로 브라우저에 도달하지 않는다. 즉 스크립트가 정답을 내는 실사용 경로가 사실상 없다.

방문자가 보는 것은 이렇다. `/ko/music` 을 하드 로드하면 `globals.css:163` 의 `html[data-section="music"]` 규칙이 붙지 않아 첫 페인트가 블루 액센트로 그려지고, hydration 후 `SectionAccent.tsx:19-23` 의 effect 가 `music` 을 세팅하며 레드로 튄다. `/ko/dev/projects` 는 블루에서 그린으로, `/ko/contact` 는 블루에서 주황으로 같은 깜빡임이 난다.

지금까지 안 보인 이유는 두 가지가 겹쳤다. `photo`·`home`·`legal` 이 `globals.css:156-158` 에서 같은 팔레트라 사진 섹션에서는 증상이 없고, `theme-script.test.ts:48,59` 가 `/music`·`/dev/projects` 같은 i18n 이전 URL 로만 검증해 테스트는 계속 초록이다.

수정은 스크립트 안에서 첫 세그먼트가 `ko`·`en` 이면 벗기고 매칭하는 것이다. 리터럴은 `JSON.stringify(LANGS)` 로 주입한다. 테스트에 `/ko/music`, `/en/dev/projects`, `/ko` 를 추가한다. 난이도 낮음.

### 높음 2. 관리자 화면의 날짜 기본값이 DB에 굳는다

`src/lib/supabase/music.ts:23-26` 의 `asDate` 가 값이 문자열·숫자·Date 중 어느 것도 아니면 `new Date()` 를 돌려준다. 읽을 때마다 "지금"이다. 같은 값을 공개 디코더 `src/lib/supabase/public/transport.ts:35-38` 의 `toDate` 는 `new Date(0)` 으로 읽고, 세 번째 사본인 `admin-list.ts:111` 은 `new Date((row.performedAt as string) ?? 0)` 으로, 사진 쪽 `photos.ts:31-34` 의 `toShotAt` 은 epoch 로 읽는다. 같은 행을 관리자 화면은 오늘로, 공개 화면은 1970년으로 본다. 디코더가 세 벌이고 폴백이 서로 다른 것이 원인이라 ARCH-D-01 과 같은 사안이다.

이 값이 화면에만 머물면 표시 오류로 끝난다. 문제는 되쓰기 경로다. `src/features/admin-maintenance/_lib/migrate-image-thumbnails.ts` 의 네 곳(`140-141`, `155-156`, `180-181`, `198-199`)이 전부 `const { id, ...input } = work; update(id, { ...input, poster })` 형태로 읽은 문서를 통째로 되쓴다. 이미지 필드만 바꾸려는 마이그레이션이 디코더가 채워 넣은 기본 날짜까지 함께 저장한다.

`music_works` 의 어떤 행에서 `data.performedAt` 이 비어 있거나 문자열·숫자가 아닐 때(구형 문서, `toJson` 이 `undefined` 를 떨어뜨린 결과), 관리자가 유지보수 화면에서 썸네일 마이그레이션을 누르면 그 연주의 공연일이 마이그레이션 실행 시각으로 영구 저장된다. 공개 목록에서 오늘 열린 연주가 된다. 사진 쪽 같은 경로에서는 `shotAt` 이 1970-01-01 로 저장된다.

지금 DB 에 그런 행이 있는지는 저장소만 봐서는 확인할 수 없다. 조건부지만, 발생하면 원래 값을 되찾을 근거가 아무 데도 남지 않는다는 점이 이 항목을 높음에 두는 이유다. 덧붙여 `asDate` 는 비결정적이라 `musicWorks.list()` 를 두 번 부르면 다른 값이 나오고, 이 사실을 고정하는 테스트가 없다.

수정은 두 단계다. 최소한으로는 관리자 디코더의 폴백을 공개 디코더와 같은 값(`new Date(0)` 또는 `null`)으로 통일한다. 난이도 낮음. 근본 수정은 마이그레이션이 전체 문서를 되쓰지 않고 이미지 필드만 patch 하게 바꾸는 것이다. 난이도 중간. 디코더 단일화는 ARCH-D-02·ARCH-D-07 과 같은 파일을 건드리므로 묶어서 하는 편이 낫다.

### 높음 3. 빈 줄 하나가 챗봇 문맥을 자른다

`src/features/chat/_lib/build-profile-context.ts` 가 챗봇에 넘길 PROFILE_CONTEXT 를 만든다. 섹션 내부의 줄은 `"\n"` 으로, 섹션과 섹션 사이는 `"\n\n"` 으로 잇는다(생산 지점 `:32` 의 `line`, `:33-34` 의 `section`). 그리고 `selectFormattedProfileContext`(`:151-161`)가 `context.split("\n\n")` 으로 블록을 나눈 뒤 첫 줄이 `## <섹션명>` 인 블록만 남긴다. 구분자가 데이터 안에 나타날 수 없다는 가정 위에 서 있는 코드다.

그 가정이 성립하지 않는다. 블록에 들어가는 `site.bio`·`site.landingLead`·`devConfig.heroLead`·`musicConfig.intro` 는 관리자 폼의 multiline textarea 다(`AdminSiteEditor.tsx:44,52`, `components/AdminInput.tsx:35`). 관리자가 Enter 를 두 번 눌러 문단을 나누면 값 안에 `"\n\n"` 이 들어가고, 섹션 블록이 그 자리에서 쪼개진다. 뒷조각은 `##` 로 시작하지 않으니 필터가 통째로 버린다.

구체적으로. `/admin/site` 에서 bio 를 `"빛과 정적의 도시 풍경.\n\n의뢰·프린트 문의는 언제나 환영합니다."` 로 저장한다. 방문자가 "연락은 어떻게 해요?"라고 묻는다. 의도 분류가 `profile` 을 고르고, 필터 결과에서 `Contact page: /contact` 줄과 공개 링크 줄이 사라진다. 프롬프트 규칙이 "PROFILE_CONTEXT 에 없으면 모른다고 답한다"(`chat-prompt.ts:36,46`)이므로 챗봇은 연락 경로를 모른다고 답한다. 같은 일이 `devConfig.heroLead` 에서 일어나면 `## Development` 블록의 Introduction 뒤가 전부 잘린다. 기술 스택, 경력, 학력, 수상, 전체 프로젝트, 최근 글 12건이 한 번에 사라지고 "프로젝트 뭐 있어요?"에 정보가 없다고 답한다.

안 보인 이유는 단순하다. mock 데이터(`mocks/site.ts`, `mocks/music.ts`, `mocks/dev.ts`)와 `build-profile-context.test.ts` fixture 가 전부 한 줄짜리 문자열이다. 관리자가 문단을 나눈 순간부터 재현된다.

최소 수정은 `line()` 에서 값의 개행을 공백으로 눌러 담는 것이다(`value.replace(/\s*\n\s*/g, " ")`). 난이도 낮음. 제대로 고치려면 블록 분리를 문자열 구분자에 맡기지 말고 `formatProfileContext` 가 `Array<{ section, text }>` 를 만들고 필터가 그 배열을 다루게 한다. 난이도 중간.

## 조건이 맞으면 잘못 동작한다

여기 있는 중간 등급 항목의 "조건"은 성격이 제각각이다. 긴 대화나 다른 타임존처럼 시간이 지나면 반드시 만나는 것도 있고, 키보드로만 조작하는 방문자처럼 이미 해당하는 사람에게는 상시인 것도 있다. 각 항목에 무엇이 방아쇠인지 적었다.

BUG-S-03. 챗 본문 바이트 상한이 스키마가 허용하는 대화보다 작다. `handle-chat-request.ts:61` 의 `MAX_BODY_BYTES` 는 20,000이고 `chat-schema.ts:20-24` 의 `maxTotalChars` 는 8,000자다. 한국어는 UTF-8 3바이트라 스키마가 허용하는 8,000자 대화의 JSON 본문은 실측 24,142바이트로 상한을 넘는다. `readLimitedBody` 가 파싱 전에 `null` 을 돌려주고 `400 REQUEST_TOO_LARGE` 가 나간다. `use-chat.ts:186-189` 가 최근 10개를 실어 보내므로 2,000자 메시지 4개면 도달한다. 방문자 화면에서는 메시지 수와 메시지당 길이가 전부 한도 안이고, 왜 거절됐는지 알 단서가 없으며 대화를 새로 시작하는 것 말고 회복 수단이 없다. 두 상수를 한 파일에서 파생 정의하고 관계를 테스트로 고정한다. 난이도 낮음.

BUG-S-04. 업로드 시각 없는 Storage 파일이 24시간 보호창을 우회한다. `storage.ts:190` 이 `createdAt: new Date(entry.created_at ?? 0)` 으로 읽고, 타입 선언 `storage.ts:16` 은 `created_at?: string | null` 로 누락 가능성을 이미 인정한다. 소비 쪽 `find-orphan-article-images.ts:161,170` 의 `uploadedAt.getTime() <= now - 24h` 는 epoch 에 대해 항상 참이다. 관리자가 새 글 본문에 이미지를 올리고 아직 삽입하지 않은 상태에서, 그 파일의 `.list()` 응답에 `created_at` 이 빠져 있고, 같은 세션에서 미사용 이미지 정리를 실행하면 방금 올린 이미지가 `deleteImageStrict` 로 영구 삭제된다. 정확히 그 상황을 막으려고 만든 보호창이 반대로 최우선 삭제 대상으로 만든다. 코드 사실은 확정이고 방아쇠는 Supabase 응답에 달렸다. `entry.created_at ? new Date(entry.created_at) : new Date()` 로 바꾸거나 `Date | null` 로 올려 후보에서 제외한다. 난이도 낮음.

BUG-S-07. Upstash 의 4xx 를 전부 설정 오류로 보고 챗을 전역 차단한다. `chat-rate-limit.ts:255-257` 이 `status >= 400 && < 500` 을 모두 `ChatRateLimitConfigurationError` 로 던지고, 그 예외는 `handle-chat-request.ts:429-432` 에서 `503 RATE_LIMIT_UNAVAILABLE` + `Retry-After: 60` 이 된다. 모든 방문자에게 챗이 꺼진다. 바로 위 `:249-253` 의 `catch` 는 네트워크 오류를 in-memory 폴백으로 흡수하므로 두 경로의 정책이 정반대다. Upstash 무료 티어의 일일 명령 상한을 넘기면 REST 가 429 를 주는데, 429 는 4xx 라 설정 오류로 분류되어 자격증명과 폴백이 멀쩡한 상태로 그날 남은 시간 챗이 죽는다. 트리아지 제한기(`triage-rate-limit.ts:76`)는 `!response.ok` 를 전부 통과시켜 같은 저장소 안에서 정책이 갈린다. 401·403·404 만 설정 오류로 좁힌다. 난이도 낮음. 다만 `chat-rate-limit.test.ts` 가 현재 동작을 계약으로 고정하고 있어 테스트를 함께 바꿔야 한다.

BUG-S-09(≡ BUG-C-14). 챗 스트림 오류 시 reader 도 fetch 도 중단되지 않는다. `use-chat.ts:68-98` 의 `readEventStream` 은 `:70` 에서 `getReader()` 를 잡고 `try/finally` 없이 예외를 밖으로 낸다. 서버가 스트림 도중 `{type:"error"}` 를 보내는 정상 경로에서 매번 지나간다. 검증 중 범위가 하나 더 있다는 것이 드러났다. 오류 처리 `.catch`(`:249-`)와 `.finally`(`:268-272`) 어느 쪽도 `controller.abort()` 를 부르지 않고, `.finally` 가 `:269` 에서 `requestRef.current = null` 로 컨트롤러 참조를 버린다. 언마운트 abort(`:122-127`)도 그때는 `null` 을 본다. 그래서 reader 만 잠기는 게 아니라 요청 자체를 어떤 경로로도 중단할 수 없고, 서버 `handleChatRequest` 의 `cancel(reason)` 훅(`handle-chat-request.ts:660`)이 호출되지 않아 진행 중인 LLM 요청이 끝까지 출력 토큰을 소비한다. 방문자는 이미 오류 화면을 보고 있다. 429·502 를 연달아 맞으면 누적된다. 올바른 형태는 같은 저장소 안에 있다(`sse-stream.ts:55-58` 의 `finally { await reader.cancel(); reader.releaseLock(); }`). `readEventStream` 에 `try/finally` 를 두르고 `.catch`/`.finally` 에서 `controller.abort()` 를 부른다. 난이도 낮음.

BUG-S-08. 비공개로 바꾼 항목이 캐시 스냅샷에서 되살아난다. `resolve-chat-screen-context.ts:232-243` 이 `fresh ?? entryOf(await deps.getScreenLookup(), ...)` 로 "최신 조회 성공 + 항목 없음"과 "최신 조회 실패"를 구분하지 않는다. 관리자가 사진 A 를 비공개로 바꾼 뒤 1시간 안에, 그 딥링크를 이미 열어 둔 방문자가 질문하면 비공개 사진의 제목·장소·카메라·렌즈·조리개·촬영일이 프롬프트에 실린다(`:103-118`). 같은 요청의 `resolveContextTarget`(`handle-chat-request.ts:239`)도 캐시 lookup 으로 `verified: true` 를 주므로 그 섹션의 RAG 검색까지 열린다. 다만 이 항목은 부분확정이다. 바로 위 `:219` 의 JSDoc 이 "최신 조회가 실패하거나 항목이 없을 때만 캐시된 스냅샷으로 물러난다"로 현재 동작을 의도라고 적어 두었다. 반면 글 경로(`handle-chat-request.ts:207-210`)는 정반대 계약을 명시한다. 버그 보고라기보다 두 경로의 설계 결정이 갈린 상태이고 어느 쪽이 맞는지는 판단이 필요하다. 고친다면 `try` 안의 성공 플래그로 두 경우를 나누고 주석을 정정한다. 난이도 낮음.

BUG-C-02. 포커스 트랩이 `position: fixed` 요소를 전부 제외한다. `use-focus-trap.ts:33` 이 `el.offsetParent !== null` 로 가시성을 판정하는데, CSSOM 명세상 computed `position: fixed` 요소의 `offsetParent` 는 항상 `null` 이다. `ImageLightbox.module.css` 의 `.close`(`:91`)·`.nav`(`:111`)·`.counter`(`:143`)가 전부 fixed 이고, 이 버튼들은 `useFocusTrap(true)` 컨테이너(`ImageLightbox.tsx:135`, JSX `:271-282`) 안에 있다. `items` 에 남는 것은 absolute 인 `.scrim` 하나다. 블로그 글에서 이미지를 눌러 라이트박스를 열고 Tab 을 누르면 포커스가 스크림 버튼으로 가고, 다시 눌러도 같은 자리로 돌아온다. 닫기 버튼과 이전·다음 화살표에는 몇 번을 눌러도 닿지 않는다. 키보드 사용자에게는 지금 상시다. `ImageLightbox.tsx:190-218` 의 document capture 리스너가 Escape 와 화살표를 받아 닫을 수는 있어서 완전히 막히지는 않는다. 다른 소비자(Modal·ChatPanel·MobileMenu·TocDrawer)는 트랩 안에 fixed 포커서블이 없어 영향이 없다. `el.getClientRects().length > 0` 으로 바꾼다. 한 줄이다.

BUG-C-05. `enabled` 가 꺼지면 표면을 화면 밖에 둔 채 되돌리지 않는다. `use-overlay-drag.ts:152-159` 의 effect 가 `:154` 에서 `if (enabled) return;` 한 뒤 `cancelScheduled()` 와 `resetSwipeSurface(false)`(`:158`)만 부른다. 같은 폐기를 하는 `abortGesture`(`:139-149`)와 `onTouchCancel` 은 `resetSurface(true)` 를 함께 부른다. 모바일에서 사진 상세 모달을 아래로 튕겨 닫고 170ms 안에 두 손가락 핀치를 넣으면(`PhotoModal.tsx:251` 의 `enabled: !zoomed` 가 즉시 false 가 된다) 닫기 타이머만 사라지고 `translate3d(0, 100dvh, 0); opacity: 0` 인라인 스타일이 남는다. 모달이 화면 밖·투명 상태로 마운트된 채 스크롤 잠금이 유지되고 `onDismiss` 는 호출되지 않는다. URL 은 여전히 `?photo=X` 다. 스크림을 탭하면 복구된다. 창은 좁지만 결과가 무겁다. 분기에 `resetSurface(false)` 한 줄을 추가한다.

BUG-C-06. `openedHere` 가 boolean 이라 연속 열기 후 닫기를 두 번 눌러야 한다. `use-query-modal.ts:22` 의 `useRef(false)` 는 여기서 몇 번 열었는지를 세지 않는데, `:37` 이 `openedHere.current = true` 를 세우고 `:43` 이 `pushCurrentUrl` 로 history 를 하나씩 쌓는다. `close`(`:49-56`)는 `router.back()` 을 한 번만 부른다. 외부 요인으로 닫혀도 리셋하지 않는다. `/ko/dev/projects` 에서 에이전트에게 A 프로젝트를 열게 하고(`use-dev-tools.ts:140` 의 `select`) 이어서 B 를 열게 하면 history 는 `[목록, ?project=A, ?project=B]` 가 되고, 닫기 버튼을 누르면 `?project=A` 로 돌아가 A 모달이 다시 열린다. 사용자 클릭만으로는 모달이 그리드를 덮어 두 번 열기 어려우므로 재현 경로는 에이전트·챗봇 쪽이다. 대조군은 같은 저장소의 `use-photo-detail-session.ts:25-30` 으로, `activeId` 를 보고 리셋하며 이동에 `replaceCurrentUrl` 을 쓴다. 난이도 중간(history 동작이라 E2E 회귀 확인이 필요하고, ARCH-A-07 의 훅 통합보다 먼저 해야 한다).

BUG-C-07-A. EXIF 촬영일시를 뷰어 타임존으로 재해석한다. `format-date.ts:9-10`(`formatShotAt`)과 `:18-19`(`formatYMD`)가 `getFullYear`·`getMonth`·`getDate`·`getHours` 로컬 게터를 쓰는데 저장값은 ISO 인스턴트다. 관리자가 KST 브라우저에서 아침 07:30 에 찍은 사진을 올리면 `lib/exif/extract.ts:66` 이 `DateTimeOriginal` 을 업로더 로컬 타임존으로 해석해 `…T22:30:00Z` 로 저장한다. 유럽이나 미국 방문자가 사진 상세를 열면 다른 날짜, 다른 시각이 촬영일시로 표시된다. EXIF 촬영일시는 촬영지 벽시계 값이라 환산 대상이 아니다. 개인 포트폴리오이고 데이터 손상은 아니라 중간으로 둔다. 수정은 저장 형식 결정이 걸려 난이도 중간이다. 벽시계 문자열을 그대로 보관하든 표시에 고정 timeZone 을 적용하든, 렌더 위치에 의존하지 않게 만든다.

## 아직 도달하지 않는다

아래는 낮음 등급이다. 앞쪽 여섯은 이미 발생하고 있지만 피해가 좁고, 뒤쪽은 코드 결함이 확정이되 그 경로에 아직 도달하는 호출자나 데이터가 없다.

이미 발생하지만 피해가 좁은 것.

- `BUG-C-12` `next.config.ts:57-69` 의 redirects 에 `/privacy`·`/terms`·`/accessibility` 가 빠져 있고 `src/proxy.ts:29` matcher 는 `"/"` 뿐이다. 무-로케일로 접근하면 404 다. `/contact`·`/search` 는 308 로 이동하므로 같은 사이트에서 규칙이 갈린다. 외부에 등록한 개인정보처리방침 URL 이 무-로케일이면 지금 깨져 있다. 3줄 수정이고 ARCH-A-26(법적 문서 라우트 통합)과 같은 파일을 건드린다.
- `BUG-C-13` 관대 파서 `photo-filter-query.ts:91` 은 `Number(raw)` 라 `0x20`·`1e2` 를 받고, 엄격 파서 `:143` 은 `/^\d+$/` 만 받는다. `?focalMin=0x20` 으로 직접 진입하면 32mm 로 설정되지만 같은 값이 챗봇 링크로 오면 query 전체가 거부된다. 결과가 경로에 따라 다르다는 점만 문제이고 실제 입력 빈도는 낮다.
- `BUG-S-12`(≡ ARCH-D-13) `storage-source-url.ts:27` 의 `if (url.username || url.password || url.port) return false;` 가 origin 비교보다 앞에 있어 로컬 Supabase 스택(`http://127.0.0.1:54321`)에서 `/api/admin/image-source` 가 전량 400 이 된다. 프로덕션은 포트가 비어 영향이 없어 개발 전용이다. 주의할 점은 `config.ts:10-11` 주석이 "포트를 제한하지 않는다"라고, `storage-source-url.ts:11-12` JSDoc 이 "비표준 포트가 있는 URL 은 전부 거부한다"라고 서로를 부정하고 있다는 것이다. 코드만 고치면 JSDoc 이 거짓이 되므로 양쪽을 함께 고쳐야 한다.
- `BUG-S-13` `remove-photo-from-album.ts:12-20` 이 `{ coverPhotoId, photoIds }` 만 돌려주고 `photos.ts:107-118` 의 스프레드가 `album.cover` 스냅샷을 보존하는데, 직후 `deletePhotoImages(id)` 가 Storage 를 지운다. 앨범 커버 사진을 삭제하면 관리자 목록에 깨진 썸네일이 뜨고(`AdminAlbumsList.tsx:87`) 챗 참조 카드에 죽은 이미지 URL 이 나간다. 공개 앨범 목록은 `album-cards.ts` 가 커버를 재계산해 영향이 없다. 순수 함수 반환에 `cover` 를 추가하면 mock 과 live 가 동시에 고쳐진다.
- `BUG-C-10` `use-infinite-scroll.ts:45` 의 deps 에 `items.length` 와 `count` 가 있어 24장을 채울 때마다 IntersectionObserver 를 재생성한다. 500장 그리드를 끝까지 스크롤하면 20회 이상이다. 결과는 맞으므로 정확성이 아니라 효율 항목이다.
- `BUG-C-11` `use-gallery-tools.ts:243` 이 `filterPhotos` 를 3인자로 부르는데 `use-photo-filter.ts:100` 은 메모된 `searchIndex` 를 4인자로 넘긴다. 에이전트가 `?q=` 상태에서 필터를 반복 호출하면 매번 전체 사진의 haystack 을 다시 만든다. 역시 효율 항목이다.

아직 도달하지 않는 것.

- `BUG-S-05` `embedding.ts:84-98` 이 청크 전량을 `input: texts` 한 배열로 보낸다. 배치 루프가 없다. 저장 쪽은 `rag.ts:23` 의 `UPSERT_CHUNK_SIZE = 100` 으로 나누는데 임베딩만 나누지 않는다. 지금 안 터지는 이유는 콘텐츠가 적어서다. 청크가 300~400개를 넘으면 전체 재생성이 실패하고, 그때 막히는 것이 모델·차원 변경의 유일한 이행 경로다. 제공자 상한 수치는 외부 문서 근거라 보류하되 배치가 없다는 사실은 확정이다.
- `BUG-S-06` `portfolio-embeddings/route.ts:86-89` 가 `generateEmbeddings` 를 먼저 부르고, 문서 수 상한 검사는 `:90` 의 `replaceRagDocuments` 안(`rag.ts:183-185`)에서 일어난다. 청크 1,001개면 전부 유료로 임베딩한 뒤 거절되고 저장은 한 건도 되지 않는다. 지금 안 터지는 이유는 BUG-S-05 와 같은 규모 조건이다. route 에서 선검사하면 된다.
- `BUG-S-10` `sse-stream.ts:35` 가 `decode(...).replaceAll("\r\n", "\n")` 을 조각마다 적용한다. `\r` 과 `\n` 은 단일 바이트라 종결자가 TCP 조각 경계에 걸리면 정규화를 놓치고 이벤트 두 개가 합쳐져 `JSON.parse` 가 던진다. 지금 안 터지는 이유는 OpenAI Responses 와 Gemini `alt=sse` 가 `\n\n` 을 쓰기 때문이다. `\r\n` 을 쓰는 프록시가 끼어야 재현된다. 경계 탐색을 `/\r?\n\r?\n/` 로 바꾸면 1줄이다.
- `BUG-S-11` `image-source/route.ts:40-49` 에서 `Number(null) = 0` 이라 `Content-Length` 없는 응답이 선검사를 통과하고 `:46` 의 `arrayBuffer()` 가 상한 없이 버퍼링한 뒤 `:47` 에서 거절한다. 지금 영향이 낮은 이유는 관리자 인증 경로이고 원본이 Storage 라서다. 같은 저장소의 `readLimitedBody` 와 `verify-sentry-signature.ts:67` 은 이미 본문을 다시 잰다.
- `BUG-S-14` `rag-chunks.ts:31-36` 의 첫 조각이 템플릿 리터럴 `` `이름/Name: ${...}` `` 라 값이 비어도 항상 truthy 다. `rag-source.ts:156` 의 `if (!raw) return base;` 가 `EMPTY_SITE_CONFIG` 를 돌려주면, `route.ts:78` 의 `chunk.sourceId === "site"` 필터를 라벨만 든 청크 하나가 통과해 upsert 되고 나머지 profile 청크는 stale 로 삭제된다. 지금 안 터지는 이유는 `site_documents/config` 조회가 빈 결과를 주는 상황(문서 삭제, RLS 가림)이 아직 없어서다.
- `BUG-S-15`(≡ ARCH-D-09) `public/transport.ts:186` 의 `fetchRow` 가 `documentCacheTag` 를 붙이는데, 저장소 전체에서 이 태그를 무효화하는 쓰기는 `site.ts:56`·`music.ts:174`·`dev.ts:102` 세 곳뿐이고 전부 `COLLECTIONS.SITE` 다. `db:devArticles:{id}` 엔트리는 어떤 쓰기로도 지워지지 않는다. 지금 영향이 없는 이유는 유일한 호출자 `handle-chat-request.ts:378` 이 항상 `fresh: true` 라 `cache: "no-store"` 로 도는 것이다. `fresh` 없이 부르는 호출자가 하나 생기면 최대 1시간 stale 이 된다.
- `BUG-S-16` `revalidate-public.ts` 가 같은 함수 안에서 컬렉션 태그에는 `updateTag`(`:35`)를, `CHAT_PROFILE_CACHE_TAG` 에는 `revalidateTag(tag, "max")`(`:48`)를 쓴다. 두 태그의 무효화 API 가 다르다는 사실은 확정이다. 다만 "`max` 프로필은 만료가 아니라 stale 표시"라는 Next 내부 시맨틱 주장은 `node_modules` 를 직접 대조하지 않아 보류한다. 정책 차이가 의도인지 사고인지 주석에 없어 확인이 필요하다.
- `BUG-S-17` `row-codec.ts:65` 의 `encodeArticleRow` 가 `publishedAt` 이 Date 가 아니면 예외 대신 `null` 을 쓴다. 발행 조건 검사는 메모리 상의 Date 로 이미 통과한 뒤라 이 강등을 잡는 곳이 없다. 지금 안 터지는 이유는 모든 호출 경로가 Date 를 넘기기 때문이다. JSON 왕복을 거치는 저장 경로가 하나 생기면 `published: true` 인데 `published_at` 이 NULL 인 글이 정렬 맨 뒤로 가라앉고 화면 어디에도 오류가 없다.
- `BUG-S-18` mock 저장소 `local-dev-article-repository.ts:150,168` 은 `if (input.published) assertPublishable(...)` 안에서만 slug 중복을 보는데, live 는 `live-dev-article-repository.ts:134,146` 이 발행 여부와 무관하게 `assertSlugAvailable` 을 부른다. mock 모드에서 같은 slug 의 초안 두 개를 만들면 두 번째 발행에서야 오류가 나고 live 에서는 저장 자체가 막힌다. 개발과 E2E 에서 재현되는 오류 시점이 실제와 다르다.
- `BUG-C-03` `use-image-zoom.ts:451-457` 이 `windowCleanupRef.current` 에 새 정리 함수를 대입만 하고 직전 것을 호출하지 않는다(`onMouseDown` 은 `:422`). 확대 후 드래그 중 창 밖에서 버튼을 놓아 `mouseup` 이 유실되면 옛 `mousemove` 쌍이 window 에 남고, 다시 드래그할 때 두 클로저가 번갈아 `commitTransform` 을 불러 이미지가 두 위치 사이를 튄다. 지금 잘 안 보이는 이유는 방아쇠가 mouseup 유실이라는 특정 조건이기 때문이다. `onMouseDown` 첫 줄에 `removeWindowListeners()` 를 넣는다.
- `BUG-C-04` `use-image-zoom.ts:94` 의 `(node && getMaxScale?.(node)) || MAX_SCALE_DEFAULT` 가 0 과 NaN 을 삼킨다. 다음 줄 `:95` 의 `Number.isFinite(raw)` 는 NaN 이 이미 걸러진 뒤라 무한대만 잡는다. 지금 피해가 없는 이유는 유일한 소비자 `ImageLightbox.tsx:154-160` 이 `surfaceWidth === 0` 을 방어하기 때문이다. 다만 `image.w === 0` 인 데이터는 막지 못한다.
- `BUG-C-08` `use-intro-ready.ts:23` 의 `animationend` 리스너에 target 검사가 없어 자손에서 버블링된 이벤트도 받는다. 지금 발생하지 않는 이유는 스플래시 안 `BrandLoader` 애니메이션이 `infinite` 라 `animationend` 가 나지 않아서다. 자식에 유한 애니메이션을 하나 추가하는 순간 `{once:true}` 리스너가 조기 발화해 불투명한 스플래시가 화면을 덮은 채 랜딩 reveal 이 시작된다. 가드 1줄이다.
- `BUG-C-09` `use-dialog-isolation.ts:15` 가 `document.querySelector` 로 첫 매치만 고르고 `:18-19` 가 `document.body.children` 과의 동일성 비교로 제외 대상을 정한다. 지금 잠복인 이유는 두 소비자(`ChatPanel.tsx:109`, `ArticleTocDrawer.tsx:66`)가 모두 body 직속 포털이고 선택자가 유일해서다. 포털 대상이 바뀌거나 같은 마크업이 두 번 마운트되면 dialog 가 자기 자신을 `inert` 로 만든다.
- `BUG-C-15` `use-tags-admin.ts:58` 의 `tags.some` 은 클로저 스냅샷을 보고 실제 추가는 `:60` 의 `setTags((prev) => ...)` 가 한다. 같은 id 를 엔터 연타로 두 번 넣으면 두 번째가 리렌더 전 값을 보고 중복 검사를 통과한다. 지금 재현이 드문 이유는 관리자가 1명이고 클릭 기반이라서다. 검사를 updater 안으로 옮긴다.
- `BUG-C-16` `analytics-consent.ts:147-157` 의 getSnapshot 이 `removeLegacyConsent(window.localStorage)` 와 `removeItem` 을 실행한다. `useSyncExternalStore` 규약 위반이다. 지금 증상이 없는 이유는 값 캐시가 반복 호출을 막기 때문이다. 정리 작업을 provider 의 mount effect 로 옮긴다.
- `BUG-C-07-B` `MusicWorksView` 가 서버에서 렌더될 때 UTC 로 `formatYMD` 가 돌아 09:00 KST 이전 공연이면 SSR HTML 과 hydration 결과가 하루 어긋난다. 지금 안 터지는 이유는 mock 데이터가 전부 17:00~20:00 저녁 공연이라 UTC 로도 같은 날짜이기 때문이다. 실제 DB 데이터에서 걸리는지는 확인할 수 없어 부분확정으로 둔다. BUG-C-07-A 와 같은 수정으로 해소된다.

## 테스트가 못 잡는 이유

| 테스트 | 잡는 것 | 통과시킨 것 |
| --- | --- | --- |
| `theme-script.test.ts` | 테마 적용, 섹션 프리픽스 매칭 | `:48,59` 가 `/music`·`/dev/projects` 같은 i18n 이전 URL 로만 검증한다. 그 URL 은 실사용에서 308 로 튕겨 브라우저에 닿지 않으므로, 테스트는 통과하는데 실사용 경로는 전부 실패한다(BUG-C-01). |
| `build-profile-context.test.ts` (9) | 섹션 필터, published 게이트, 글 12건 상한, 언어 선택 | fixture 문자열이 전부 한 줄이라 값 안에 `\n\n` 이 들어가는 경우가 없다(BUG-S-01). |
| `migrate-image-thumbnails.test.ts` (6) | dry-run 집계, 세 종류 업로드, 앨범 커버 반영, 인증 실패 | fixture 의 `performedAt`·`shotAt` 이 항상 유효해 디코더 기본값이 되쓰기로 굳는 왕복이 드러나지 않는다(BUG-S-02). |
| `chat-schema.test.ts` + `handle-chat-request.test.ts` | 메시지 수·길이 상한, `REQUEST_TOO_LARGE` 분기 | fixture 가 ASCII 라 한 글자가 1바이트로 계산된다. 한국어 8,000자가 20,000바이트를 넘는다는 경계를 재현하는 케이스가 없다(BUG-S-03). |
| `find-orphan-article-images.test.ts` (16) | 24시간 창, 그룹 단위 판정, 확인 토큰, 파일별 실패 격리 | 모든 fixture 가 `uploadedAt` 을 명시해 `created_at` 이 없는 파일이 등장하지 않는다(BUG-S-04). |
| `embedding.test.ts` (8) | 키 누락, 차원 env, 401 처리 | 입력이 항상 1~2개라 배치 부재를 재현할 수 없다(BUG-S-05). |
| `rag.test.ts` (11) | 범위 계산, 차원 검증, upsert 후 delete 순서, `MAX_DOCUMENTS` | 상한 검사의 시점이 route 쪽이라 임베딩 전인지 후인지는 검증 대상 밖이다(BUG-S-06). |
| `chat-rate-limit.test.ts` | Lua 반환 4요소, 폴백, 일일 상한, 문자 예산 | 4xx 를 `ChatRateLimitConfigurationError` 로 바꾸는 동작을 계약으로 고정했다. 429 가 여기 섞이는 것이 문제인데 테스트가 그것을 보증하고 있다(BUG-S-07). |
| `use-chat.test.tsx` | 스트림 이벤트 처리, 오류 메시지, 재시도 | reader 해제·스트림 취소·`controller.abort()` 호출 여부를 보지 않는다(BUG-S-09). |
| `sse-stream.test.ts` | `data:` 파싱, `[DONE]`, 중단 시 예외 | `\r\n` 이 조각 경계에 걸리는 입력이 없다(BUG-S-10). |
| `storage-source-url.test.ts` | 다른 origin·버킷·서명 URL 거부 | 포트가 있는 origin(로컬 스택)에 대한 케이스가 없다(BUG-S-12). |
| `remove-photo-from-album.test.ts` (1) | `photoIds` 제거와 `coverPhotoId` 승계 | 반환 타입에 `cover` 가 없어 스냅샷 미갱신이 애초에 테스트 관심 밖이다(BUG-S-13). |
| `list-crud.test.ts` (14) | 정책 분기, 0행 처리, 정렬 RPC 대조 | 디코더 기본값이 쓰기로 굳는 read-write 왕복은 범위 밖이다(BUG-S-02). |
| jsdom 환경 전반 | DOM 구조, 이벤트, 상태 전이 | 레이아웃이 없어 `offsetParent` 가 항상 `null` 이다. 포커스 트랩의 가시성 판정 결함은 단위 테스트로 재현 자체가 불가능하다(BUG-C-02). |

comment drift(BUG-S-19, Firestore 잔재 주석)는 ARCH-D-10·ARCH-A-14 와 같은 정리 작업이라 05 문서에서 다룬다.
