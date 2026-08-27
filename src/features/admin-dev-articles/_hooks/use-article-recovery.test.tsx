// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  UnsavedGuardProvider,
  useUnsavedGuardContext,
} from "@/features/admin-shell/_components/UnsavedGuardProvider";

import { useArticleEditor } from "@/features/admin-dev-articles/_hooks/use-article-editor";

import type { useArticleReferences } from "@/features/admin-dev-articles/_hooks/use-article-references";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), push: vi.fn() }) }));

const references = {
  tags: [],
  projects: [],
  articles: [],
  error: null,
} as unknown as ReturnType<typeof useArticleReferences>;

let navigated = false;

/** 셸 헤더(워드마크·사이트 보기·로그아웃)가 confirmLeave 를 읽는 방식과 같다. */
const ShellLink = () => {
  const guard = useUnsavedGuardContext();
  return (
    <button
      type="button"
      onClick={() => {
        if (guard?.confirmLeave() ?? true) navigated = true;
      }}
    >
      사이트 보기
    </button>
  );
};

const ArticleEditorProbe = () => {
  const editor = useArticleEditor("a1", references);
  return (
    <button type="button" onClick={() => editor.patch({ body: "고친 본문" })}>
      입력
    </button>
  );
};

afterEach(cleanup);

describe("블로그 편집기와 셸 이탈 가드", () => {
  it("편집 중이면 셸 링크가 이동 전에 묻는다", async () => {
    navigated = false;
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <UnsavedGuardProvider>
        <ArticleEditorProbe />
        <ShellLink />
      </UnsavedGuardProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "사이트 보기" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(navigated).toBe(true);

    navigated = false;
    await userEvent.click(screen.getByRole("button", { name: "입력" }));
    await userEvent.click(screen.getByRole("button", { name: "사이트 보기" }));

    // 열한 개 폼과 같은 가드에 등록되지 않으면 여기서 묻지 않고 그냥 이동한다.
    expect(confirm).toHaveBeenCalled();
    expect(navigated).toBe(false);
    confirm.mockRestore();
  });
});
