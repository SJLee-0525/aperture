// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ArticleBodyEditor } from "@/features/admin-dev-articles/_components/ArticleBodyEditor";

import type { ArticleBodyUploader } from "@/features/admin-dev-articles/_lib/article-image-uploader";

/** 스크롤이 움직였는지 보이도록 본문을 길게 둔다. */
const LONG_BODY = Array.from({ length: 60 }, (_, line) => `문단 ${line}`).join("\n");
const KEPT_SCROLL_TOP = 420;
const CARET = 120;

const upload = Object.assign(
  async () => ({ url: "https://cdn.test/a.webp", path: "p", w: 8, h: 6 }),
  { variant: "body" },
) as ArticleBodyUploader;

const textareaOf = () => screen.getByLabelText("본문 Markdown") as HTMLTextAreaElement;

/**
 * 본문이 바뀌면 브라우저가 커서를 끝으로 보내며 스크롤을 맨 아래로 내린다.
 * jsdom 은 레이아웃이 없어 이 동작이 일어나지 않으므로, 상태를 들고 있는 이 래퍼가
 * 값이 바뀔 때 직접 재현한다. 재현이 없으면 스크롤 복원이 빠져도 테스트가 통과한다.
 */
const Harness = () => {
  const [body, setBody] = useState(LONG_BODY);
  return (
    <ArticleBodyEditor
      value={body}
      upload={upload}
      onChange={(next) => {
        const textarea = textareaOf();
        textarea.scrollTop = Number(textarea.scrollHeight);
        setBody(next);
      }}
    />
  );
};

/** 관리자가 본문 중간을 보고 있는 상태를 만든다. */
const renderScrolledEditor = (): HTMLTextAreaElement => {
  render(<Harness />);
  const textarea = textareaOf();
  // jsdom 은 scrollHeight 가 0이라 '맨 아래로 내려간 상태'가 구분되지 않는다.
  Object.defineProperty(textarea, "scrollHeight", { value: 9999, configurable: true });
  textarea.setSelectionRange(CARET, CARET);
  textarea.scrollTop = KEPT_SCROLL_TOP;
  return textarea;
};

afterEach(cleanup);

describe("ArticleBodyEditor", () => {
  it("YouTube 를 넣어도 보던 위치를 유지한다", async () => {
    const textarea = renderScrolledEditor();

    fireEvent.click(screen.getByRole("button", { name: "YouTube" }));
    fireEvent.change(screen.getByLabelText("영상 주소"), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.change(screen.getByLabelText("영상 제목"), { target: { value: "제목" } });
    fireEvent.click(screen.getByRole("button", { name: "본문에 넣기" }));

    await waitFor(() => expect(textarea.value).toContain("::youtube"));
    await waitFor(() => expect(textarea.scrollTop).toBe(KEPT_SCROLL_TOP));
  });

  it("이미지를 넣어도 보던 위치를 유지하고 커서를 삽입 지점에 둔다", async () => {
    const textarea = renderScrolledEditor();

    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File([], "a.png", { type: "image/png" })] },
    });
    fireEvent.change(screen.getByLabelText(/대체 텍스트/), { target: { value: "설명" } });
    fireEvent.click(screen.getByRole("button", { name: "본문에 넣기" }));

    await waitFor(() => expect(textarea.value).toContain("![설명]"));
    await waitFor(() => expect(textarea.scrollTop).toBe(KEPT_SCROLL_TOP));
    // 커서가 본문 끝이 아니라 삽입한 조각 뒤에 있어야 이어서 쓸 수 있다.
    expect(textarea.selectionStart).toBeLessThan(textarea.value.length);
  });
});
