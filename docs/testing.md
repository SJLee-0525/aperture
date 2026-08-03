# UI 품질 테스트

## 시각 회귀

Playwright가 핵심 공개 화면 6개를 데스크톱·모바일로 캡처한다. 기준 이미지는
`e2e/visual/public-pages.visual.e2e.ts-snapshots/`에 커밋한다.

Windows에서는 로컬로 실행할 수 있다.

```powershell
npm run test:visual
npm run test:visual:update
```

픽셀 기준선은 Windows Chromium 렌더링에 고정되어 있어 macOS에서는 시각 테스트가 자동으로
skip된다. 맥에서 디자인을 변경했다면 브랜치를 push한 뒤 GitHub의 **Actions → Update visual
snapshots → Run workflow**에서 해당 브랜치를 선택한다. Windows runner가 production build 기준
이미지를 생성해 `[TEST] Windows 시각 기준선 갱신` 커밋으로 같은 브랜치에 push한다. 실행 결과의
`windows-visual-snapshots-*` artifact에서도 생성 이미지를 확인할 수 있으며, 커밋 후 CI도 새
커밋을 대상으로 자동 실행된다.

이미 실행 중인 로컬 서버를 사용할 때는 다음처럼 지정할 수 있다.

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3001"
npm run test:visual
```

의도한 디자인 변경일 때만 `test:visual:update`로 production build 기준 이미지를 갱신하고 이미지 diff를
검토한다. CI 실패 시 `playwright-reports` 아티팩트에서 actual·expected·diff를 확인한다.

## 접근성

```powershell
npm run test:a11y
```

axe가 핵심 공개 화면의 문서 구조, ARIA, WCAG AA 색상 대비를 검사한다.

## Lighthouse

프로덕션 빌드가 있어야 한다.

```powershell
npm run build
npm run test:lighthouse
```

CI는 홈·사진·음악·프로젝트 화면의 Lighthouse 보고서를 `lighthouse-reports` 아티팩트로
보관한다. 성능은 초기 기준을 수집하기 위해 경고로 두며, 접근성·Best Practices·SEO가
기준 미달이면 실패한다.

## Storybook

```powershell
npm run storybook
npm run build-storybook
```

테마와 섹션 액센트는 상단 툴바에서 변경할 수 있다. 새 재사용 UI를 추가할 때 기본,
빈 상태, 긴 텍스트, 모바일처럼 레이아웃 경계가 달라지는 상태를 story로 함께 추가한다.
