// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArticleCoverField } from "@/features/admin-dev-articles/_components/ArticleCoverField";

import { emptyArticleInput } from "@/features/admin-dev-articles/_lib/dev-article-form";

import type { ArticleCoverUploader } from "@/features/admin-dev-articles/_lib/article-image-uploader";

afterEach(cleanup);

describe("ArticleCoverField", () => {
  it("이미지가 아닌 파일은 업로더를 호출하기 전에 거부한다", () => {
    const upload = Object.assign(vi.fn(), { variant: "cover" as const }) as ArticleCoverUploader;
    render(
      <ArticleCoverField form={emptyArticleInput()} upload={upload} onPatch={vi.fn()} />,
    );

    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File([], "document.pdf", { type: "application/pdf" })] },
    });

    expect(screen.getByRole("alert").textContent).toContain("이미지 파일만");
    expect(upload).not.toHaveBeenCalled();
  });
});
