import { describe, expect, it } from "vitest";

import { getMockReply } from "@/features/chat/_lib/mock-chat";

describe("getMockReply", () => {
  it.each([
    ["사진 보여줘", "photo", "/photo?photo="],
    ["연주를 소개해 줘", "music", "/music?work="],
    ["개발 프로젝트 알려줘", "project", "/dev/projects?project="],
  ] as const)("%s 질문에 모달 딥링크 참조 카드를 제공한다", (question, type, href) => {
    const references = getMockReply(question, "ko").references;

    expect(references?.length).toBeGreaterThan(0);
    expect(references?.[0]).toMatchObject({ type });
    expect(references?.[0]?.href).toContain(href);
  });

  it("영어 응답 카드에는 영어 제목과 설명을 사용한다", () => {
    const reference = getMockReply("show me photos", "en").references?.[0];

    expect(reference?.title).toBe("Harbor at Dawn");
    expect(reference?.subtitle).toBe("Minato, Tokyo");
  });
});
