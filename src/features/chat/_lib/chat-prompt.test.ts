import { describe, expect, it } from "vitest";

import { buildChatInstructions } from "@/features/chat/_lib/chat-prompt";

describe("buildChatInstructions", () => {
  it("한국어 응답과 공개 문맥 경계를 지시한다", () => {
    const prompt = buildChatInstructions("ko", "# PROFILE_CONTEXT\nName: 이성준");

    expect(prompt).toContain("자연스러운 한국어");
    expect(prompt).toContain("따뜻하고 살가운 말투");
    expect(prompt).toContain("호들갑스러운 감탄이나 아부하는 표현은 피한다");
    expect(prompt).toContain("공개 정보만 근거");
    expect(prompt).toContain("의도가 불명확한 입력");
    expect(prompt).toContain("포트폴리오 밖의 가벼운 대화");
    expect(prompt).toContain("가능한 다음 단계");
    expect(prompt).toContain("알 수 없다는 이유만으로 /contact 페이지를 안내하지 않는다");
    expect(prompt).toContain("PROFILE_CONTEXT의 내부 경로만");
    expect(prompt).toContain("연락·문의·협업 방법을 묻지 않았다면 /contact 링크를 추가하지 않는다");
    expect(prompt).toContain(
      "일반적인 자기소개, 역량, 연락 방법 질문에는 references를 추가하지 않는다",
    );
    expect(prompt).toContain("요청한 개수만큼 선택하고 일반 섹션 links로 대체하지 않는다");
    expect(prompt).toContain("Markdown 문법이나 URL을 쓰지 않고");
    expect(prompt).toContain("본인인 것처럼 말하지 않는다");
    expect(prompt).toContain("Name: 이성준");
  });

  it("영어 설정에서는 영어 답변을 강제한다", () => {
    const prompt = buildChatInstructions("en", "# PROFILE_CONTEXT\nName: Sungjoon Lee");

    expect(prompt).toContain("Always answer in natural English.");
  });
});
