"use client";

import styles from "./ArticleMarkdownHelp.module.css";

/**
 * 지원 문법 예시. 복사해 붙이면 그대로 동작하도록 실제 문법 그대로 적는다.
 * 코드 언어 목록은 `markdown-code-language` 가 아는 별칭과 같은 값이다.
 */
const HELP_SECTIONS: { title: string; body: string }[] = [
  {
    title: "글의 뼈대",
    body: [
      "## 큰 제목 (본문은 ## 부터)",
      "### 작은 제목",
      "",
      "문단은 빈 줄로 나눕니다. **굵게**, *기울임*, `인라인 코드`.",
      "",
      "- 목록",
      "1. 번호 목록",
      "",
      "> 인용문",
      "",
      "---",
    ].join("\n"),
  },
  {
    title: "표",
    body: ["| 항목 | 비용 |", "| --- | ---: |", "| 호스팅 | $0 |"].join("\n"),
  },
  {
    title: "코드",
    body: [
      "```ts",
      "const a: number = 1;",
      "```",
      "",
      "언어: js · jsx · ts · tsx · java · c · cpp · python · bash · json · css · sql",
      "모르는 언어는 색 없이 그대로 보여 줍니다.",
    ].join("\n"),
  },
  {
    title: "이미지와 캡션",
    body: [
      "![관리자 화면의 블로그 편집기](허용된-이미지-주소)",
      "::caption[블로그 편집 화면]",
      "",
      "이미지 버튼으로 올리면 위 문법이 커서 자리에 들어갑니다.",
      "캡션은 바로 앞 이미지에만 붙습니다.",
    ].join("\n"),
  },
  {
    title: "YouTube",
    body: [
      '::youtube[https://www.youtube.com/watch?v=VIDEO_ID]{title="영상 제목" source="YouTube"}',
      "",
      "title 은 화면 낭독기가 읽을 이름이라 필수, source 는 선택입니다.",
    ].join("\n"),
  },
  {
    title: "링크",
    body: [
      "[문서](https://example.com) · [메일](mailto:hello@example.com) · [프로젝트](/dev/projects)",
      "",
      "https 주소, 메일 주소, 사이트 내부 경로만 넣을 수 있습니다.",
    ].join("\n"),
  },
];

/**
 * 접을 수 있는 Markdown 도움말(계획 §3). 기본은 접어 두고 편집 영역을 넓게 쓴다.
 *
 * @returns {JSX.Element}
 */
const ArticleMarkdownHelp = () => (
  <details className={styles.help}>
    <summary className={styles.summary}>Markdown 도움말</summary>
    <div className={styles.body}>
      {HELP_SECTIONS.map((section) => (
        <section key={section.title} className={styles.item}>
          <h3 className={styles.itemTitle}>{section.title}</h3>
          <pre className={styles.sample}>{section.body}</pre>
        </section>
      ))}
    </div>
  </details>
);

export { ArticleMarkdownHelp };
