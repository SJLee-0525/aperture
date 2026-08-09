// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LegalDocumentView } from "@/features/legal/_components/LegalDocumentView";

describe("LegalDocumentView", () => {
  afterEach(cleanup);

  it("상위에서 주입한 제목·시행일·섹션만 공용 문서 구조로 렌더한다", () => {
    render(
      <LegalDocumentView
        document={{
          eyebrow: "Policy",
          title: "테스트 문서",
          effective: "시행일: 오늘",
          sections: [
            { title: "첫 섹션", content: <p>첫 본문</p> },
            {
              title: "둘째 섹션",
              content: (
                <ul>
                  <li>목록 본문</li>
                </ul>
              ),
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "테스트 문서" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
    expect(screen.getByText("시행일: 오늘")).toBeTruthy();
    expect(screen.getByText("목록 본문")).toBeTruthy();
  });
});
