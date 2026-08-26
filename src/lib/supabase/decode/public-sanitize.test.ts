import { describe, expect, it } from "vitest";

import { decodeDevProject } from "@/lib/supabase/decode/dev";
import { decodeMusicWork } from "@/lib/supabase/decode/music";
import {
  sanitizeDevProjectForPublic,
  sanitizeMusicWorkForPublic,
  sanitizeSiteConfigForPublic,
} from "@/lib/supabase/decode/public-sanitize";
import { decodeSiteConfig } from "@/lib/supabase/decode/site";

/**
 * 이 계층이 존재하는 이유를 고정한다. 정화를 디코더에 넣으면 관리자 폼이 정화된 빈 값을
 * 다시 저장하고, 전체 문서를 되쓰는 경로도 원본 주소를 지운다.
 */
describe("공개 정화", () => {
  it("실행 가능한 예매 링크를 빈 값으로 만든다", () => {
    const work = decodeMusicWork("w1", { ticketUrl: "javascript:alert(1)" });

    expect(work.ticketUrl).toBe("javascript:alert(1)");
    expect(sanitizeMusicWorkForPublic(work).ticketUrl).toBe("");
  });

  it("프로젝트 링크에서 허용되지 않은 스킴을 버린다", () => {
    const project = decodeDevProject("d1", {
      links: [
        { label: "GitHub", href: "https://github.test/a" },
        { label: "위험", href: "javascript:alert(1)" },
      ],
    });

    expect(project.links).toHaveLength(2);
    expect(sanitizeDevProjectForPublic(project).links).toEqual([
      { label: "GitHub", href: "https://github.test/a" },
    ]);
  });

  it("연락 링크의 mailto 는 남긴다", () => {
    const config = decodeSiteConfig({
      links: [
        { label: "Mail", href: "mailto:a@b.test" },
        { label: "위험", href: "javascript:alert(1)" },
      ],
    });

    expect(sanitizeSiteConfigForPublic(config).links).toEqual([
      { label: "Mail", href: "mailto:a@b.test" },
    ]);
  });
});
