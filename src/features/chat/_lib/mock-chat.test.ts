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

  it.each([
    ["안녕하세요", "안녕하세요!"],
    ["4242", "조금만 더 알려주실래요"],
    ["이성준이 사는 곳의 시간은 지금 몇 시야?", "현재 거주 지역"],
  ])("%s 입력에 대화를 이어가는 응답을 제공한다", (question, expected) => {
    expect(getMockReply(question, "ko").content).toContain(expected);
  });
});
