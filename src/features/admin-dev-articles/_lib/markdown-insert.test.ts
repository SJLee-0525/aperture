import { describe, expect, it } from "vitest";

import {
  imageMarkdown,
  insertAtSelection,
  youtubeMarkdown,
} from "@/features/admin-dev-articles/_lib/markdown-insert";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

const STORAGE_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/dev-blog%2Fa%2F1.webp?alt=media";

describe("insertAtSelection", () => {
  it("커서 자리에 빈 줄로 띄워 넣는다", () => {
    const { value } = insertAtSelection("앞 문단", { start: 3, end: 3 }, "조각");

    expect(value).toBe("앞 문\n\n조각\n\n단");
  });

  it("선택한 구간을 조각으로 바꾼다", () => {
    const { value } = insertAtSelection("지울 것", { start: 0, end: 2 }, "새것");

    expect(value).toBe("새것\n\n 것");
  });

  it("이미 빈 줄이면 더 띄우지 않는다", () => {
    const { value } = insertAtSelection("앞\n\n\n\n뒤", { start: 3, end: 3 }, "조각");

    expect(value).toBe("앞\n\n조각\n\n뒤");
  });

  it("본문이 비어 있으면 앞뒤 줄바꿈을 넣지 않는다", () => {
    expect(insertAtSelection("", { start: 0, end: 0 }, "조각").value).toBe("조각");
  });

  it("커서를 조각 끝으로 옮긴다", () => {
    const { value, selection } = insertAtSelection("앞", { start: 1, end: 1 }, "조각");

    expect(value.slice(0, selection.start)).toBe("앞\n\n조각");
    expect(selection.start).toBe(selection.end);
  });

  it("범위를 벗어난 위치는 본문 끝으로 맞춘다", () => {
    const { value } = insertAtSelection("앞", { start: 99, end: 99 }, "조각");

    expect(value).toBe("앞\n\n조각");
  });

  it("끝이 시작보다 앞이어도 지우지 않는다", () => {
    const { value } = insertAtSelection("앞뒤", { start: 2, end: 0 }, "조각");

    expect(value).toBe("앞뒤\n\n조각");
  });
});

describe("imageMarkdown", () => {
  it("대체 텍스트를 포함한 이미지 문법을 만든다", () => {
    expect(imageMarkdown(STORAGE_IMAGE, "압축 결과 비교")).toBe(
      `![압축 결과 비교](${STORAGE_IMAGE})`,
    );
  });

  it("캡션은 바로 다음 줄에 붙인다", () => {
    expect(imageMarkdown(STORAGE_IMAGE, "설명", { caption: "3단 WebP" })).toBe(
      `![설명](${STORAGE_IMAGE})\n::caption[3단 WebP]`,
    );
  });

  it("캡션이 공백뿐이면 줄을 넣지 않는다", () => {
    expect(imageMarkdown(STORAGE_IMAGE, "설명", { caption: "   " })).toBe(
      `![설명](${STORAGE_IMAGE})`,
    );
  });

  it("대괄호와 줄바꿈이 문법을 깨지 않는다", () => {
    expect(imageMarkdown(STORAGE_IMAGE, "대[괄호]\n두 줄")).toBe(
      `![대괄호 두 줄](${STORAGE_IMAGE})`,
    );
  });

  it("크기를 알면 title 자리에 너비x높이를 적는다", () => {
    expect(imageMarkdown(STORAGE_IMAGE, "설명", { width: 2048, height: 1365 })).toBe(
      `![설명](${STORAGE_IMAGE} "2048x1365")`,
    );
  });

  it("캡션과 크기를 함께 받으면 두 문법을 모두 유지한다", () => {
    expect(
      imageMarkdown(STORAGE_IMAGE, "설명", { caption: "3단 WebP", width: 960, height: 640 }),
    ).toBe(`![설명](${STORAGE_IMAGE} "960x640")\n::caption[3단 WebP]`);
  });

  it.each([
    ["0", 0, 100],
    ["음수", -10, 20],
    ["소수", 100.5, 200],
    ["NaN", Number.NaN, 200],
    ["한쪽만 있음", 100, undefined],
  ])("%s 는 크기로 적지 않는다", (_label, width, height) => {
    expect(imageMarkdown(STORAGE_IMAGE, "설명", { width, height })).toBe(
      `![설명](${STORAGE_IMAGE})`,
    );
  });
});

describe("youtubeMarkdown", () => {
  it("제목만 있으면 title 속성만 넣는다", () => {
    expect(youtubeMarkdown("https://youtu.be/kX3nB7dQ2Ls", "배포 흐름 데모")).toBe(
      '::youtube[https://youtu.be/kX3nB7dQ2Ls]{title="배포 흐름 데모"}',
    );
  });

  it("출처가 있으면 source 를 덧붙인다", () => {
    expect(youtubeMarkdown("https://youtu.be/kX3nB7dQ2Ls", "제목", "YouTube")).toContain(
      'source="YouTube"',
    );
  });

  it("따옴표를 지워 속성이 깨지지 않게 한다", () => {
    expect(youtubeMarkdown("https://youtu.be/kX3nB7dQ2Ls", '제목 "인용"')).toBe(
      '::youtube[https://youtu.be/kX3nB7dQ2Ls]{title="제목 인용"}',
    );
  });
});

describe("삽입한 조각의 렌더", () => {
  it("이미지·캡션 조각이 검증을 통과한다", () => {
    const { document, issues } = parseArticleMarkdown(
      imageMarkdown(STORAGE_IMAGE, "압축 결과 비교", { caption: "3단 WebP" }),
    );

    expect(issues).toEqual([]);
    expect(document.blocks).toEqual([
      {
        type: "image",
        src: STORAGE_IMAGE,
        alt: "압축 결과 비교",
        caption: "3단 WebP",
        dimensions: null,
      },
    ]);
  });

  it("YouTube 조각이 검증을 통과한다", () => {
    const { document, issues } = parseArticleMarkdown(
      youtubeMarkdown("https://www.youtube.com/watch?v=kX3nB7dQ2Ls", "배포 흐름 데모", "YouTube"),
    );

    expect(issues).toEqual([]);
    expect(document.blocks).toEqual([
      { type: "youtube", videoId: "kX3nB7dQ2Ls", title: "배포 흐름 데모", source: "YouTube" },
    ]);
  });

  it("본문 중간에 넣어도 단독 블록이 된다", () => {
    const { value } = insertAtSelection(
      "앞 문단입니다.\n\n뒤 문단입니다.",
      { start: 8, end: 8 },
      imageMarkdown(STORAGE_IMAGE, "설명"),
    );
    const { document, issues } = parseArticleMarkdown(value);

    expect(issues).toEqual([]);
    expect(document.blocks.filter((block) => block.type === "image")).toHaveLength(1);
  });
});
