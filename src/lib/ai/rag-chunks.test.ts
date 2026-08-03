import { describe, expect, it } from "vitest";

import { buildRagChunks } from "@/lib/ai/rag-chunks";
import type { RagSourceData } from "@/lib/content/rag-source";

describe("buildRagChunks", () => {
  it("프로젝트 트러블슈팅과 각 포트폴리오 섹션을 별도 청크로 만든다", () => {
    const data = {
      site: {
        name: { ko: "이성준", en: "Sungjoon" },
        tagline: { ko: "개발자", en: "Developer" },
        landingLead: { ko: "소개", en: "Intro" },
        contactLead: { ko: "연락", en: "Contact" },
        bio: { ko: "사진가", en: "Photographer" },
        links: [],
        tags: [{ id: "sea", ko: "바다", en: "Sea" }],
      },
      devConfig: {
        heroLead: { ko: "개발", en: "Dev" },
        stack: [],
        timeline: [],
        education: [],
        awards: [
          {
            id: "award-1",
            year: "2025",
            projectId: "",
            name: { ko: "해커톤 대상", en: "Hackathon Grand Prize" },
            place: { ko: "주최사", en: "Host" },
            description: { ko: "설명", en: "Description" },
          },
        ],
      },
      musicConfig: { intro: { ko: "피아노", en: "Piano" }, career: [], education: [] },
      devProjects: [
        {
          id: "project-1",
          title: { ko: "프로젝트", en: "Project" },
          category: { ko: "웹", en: "Web" },
          summary: { ko: "요약", en: "Summary" },
          overview: { ko: "개요", en: "Overview" },
          position: { ko: "프론트", en: "Frontend" },
          techTags: ["React"],
          features: [],
          roles: [],
          achievements: [],
          troubleshooting: [
            {
              title: { ko: "성능", en: "Performance" },
              problem: { ko: "느림", en: "Slow" },
              solution: { ko: "캐시", en: "Cache" },
              result: { ko: "개선", en: "Improved" },
            },
          ],
        },
      ],
      musicWorks: [],
      musicAwards: [],
      musicMedia: [],
      photos: [
        {
          id: "photo-1",
          title: { ko: "바다", en: "Sea" },
          place: { ko: "부산", en: "Busan" },
          tags: ["sea"],
          camera: "Sony",
          lens: "35mm",
        },
      ],
      albums: [],
    } as unknown as RagSourceData;

    const chunks = buildRagChunks(data);

    expect(new Set(chunks.map(({ id }) => id)).size).toBe(chunks.length);
    expect(chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          section: "development",
          chunkKey: "troubleshooting-0",
          text: expect.stringContaining("캐시"),
        }),
        expect.objectContaining({
          section: "photography",
          sourceId: "photo-1",
          text: expect.stringContaining("바다 / Sea"),
        }),
        expect.objectContaining({ section: "music", sourceType: "musicConfig" }),
        expect.objectContaining({ section: "profile" }),
      ]),
    );
  });

  it("개발 수상 청크는 site/dev 문서 단위(sourceId=dev)로 실리고 항목은 chunkKey로 구분한다", () => {
    const data = {
      site: { name: { ko: "", en: "" }, tagline: { ko: "", en: "" }, landingLead: { ko: "", en: "" }, contactLead: { ko: "", en: "" }, bio: { ko: "", en: "" }, links: [], tags: [] },
      devConfig: {
        heroLead: { ko: "", en: "" },
        stack: [],
        timeline: [],
        education: [],
        awards: [
          {
            id: "award-1",
            year: "2025",
            projectId: "",
            name: { ko: "해커톤 대상", en: "Hackathon Grand Prize" },
            place: { ko: "주최사", en: "Host" },
            description: { ko: "설명", en: "Description" },
          },
        ],
      },
      musicConfig: { intro: { ko: "", en: "" }, career: [], education: [] },
      devProjects: [],
      musicWorks: [],
      musicAwards: [],
      musicMedia: [],
      photos: [],
      albums: [],
    } as unknown as RagSourceData;

    const awardChunks = buildRagChunks(data).filter(({ sourceType }) => sourceType === "devAward");

    expect(awardChunks).toEqual([
      expect.objectContaining({
        section: "development",
        sourceId: "dev",
        chunkKey: "award-award-1",
        text: expect.stringContaining("해커톤 대상"),
      }),
    ]);
  });
});
