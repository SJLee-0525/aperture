import type { RagSourceData } from "@/lib/content/rag-source";
import type { LocalizedText } from "@/types/localized";
import type { RagChunk, RagSection } from "@/types/rag";

const localized = (value: LocalizedText) => [value.ko, value.en].filter(Boolean).join(" / ");

/**
 * 라벨과 값을 잇되 값이 비면 줄 자체를 만들지 않는다.
 * 템플릿 리터럴로 이으면 값이 비어도 라벨 때문에 항상 truthy 가 되어,
 * 빈 문서에서도 라벨만 든 청크가 만들어지고 나머지 청크를 stale 로 지운다.
 */
const labeled = (label: string, value: string): string | null =>
  value ? `${label}: ${value}` : null;
const chunkId = (section: RagSection, type: string, sourceId: string, key: string) =>
  encodeURIComponent(`${section}:${type}:${sourceId}:${key}`);
const chunk = (
  section: RagSection,
  sourceType: string,
  sourceId: string,
  chunkKey: string,
  parts: Array<string | null | undefined>,
): RagChunk | null => {
  const text = parts.filter(Boolean).join(" | ").trim();
  return text
    ? {
        id: chunkId(section, sourceType, sourceId, chunkKey),
        section,
        sourceType,
        sourceId,
        chunkKey,
        text,
      }
    : null;
};

const buildRagChunks = (data: RagSourceData): RagChunk[] => {
  const chunks: Array<RagChunk | null> = [];
  chunks.push(
    chunk("profile", "profile", "site", "intro", [
      labeled("이름/Name", localized(data.site.name)),
      localized(data.site.tagline),
      localized(data.site.landingLead),
      localized(data.site.contactLead),
    ]),
    chunk("photography", "profile", "site", "bio", [localized(data.site.bio)]),
    chunk("development", "devConfig", "dev", "intro-stack", [
      localized(data.devConfig.heroLead),
      labeled(
        "기술/Stack",
        data.devConfig.stack.flatMap((group) => group.items.map((item) => item.name)).join(", "),
      ),
    ]),
    chunk("music", "musicConfig", "music", "intro", [localized(data.musicConfig.intro)]),
  );

  data.devProjects.forEach((project) => {
    chunks.push(
      chunk("development", "project", project.id, "overview", [
        labeled("프로젝트/Project", localized(project.title)),
        localized(project.category),
        localized(project.summary),
        localized(project.overview),
        labeled("역할/Role", localized(project.position)),
        labeled("기술/Tech", project.techTags.join(", ")),
      ]),
      chunk("development", "project", project.id, "work", [
        ...project.features.map((item) => labeled("기능/Feature", localized(item))),
        ...project.roles.map((item) => labeled("담당/Work", localized(item))),
        ...project.achievements.map((item) => labeled("성과/Achievement", localized(item))),
      ]),
      ...project.troubleshooting.map((item, index) =>
        chunk("development", "project", project.id, `troubleshooting-${index}`, [
          labeled("트러블슈팅/Troubleshooting", localized(item.title)),
          labeled("문제/Problem", localized(item.problem)),
          labeled("해결/Solution", localized(item.solution)),
          item.result ? labeled("결과/Result", localized(item.result)) : null,
        ]),
      ),
    );
  });
  data.devConfig.timeline.forEach((item, index) =>
    chunks.push(
      chunk("development", "devCareer", "dev", `career-${index}`, [
        item.period,
        localized(item.title),
        localized(item.role),
        localized(item.desc),
      ]),
    ),
  );
  data.devConfig.education.forEach((item, index) =>
    chunks.push(
      chunk("development", "devEducation", "dev", `education-${index}`, [
        item.period,
        localized(item.title),
      ]),
    ),
  );
  // 개발 수상은 site/dev 문서의 배열 필드 — 저장 단위가 site/dev 이므로 sourceId 도 "dev" 로
  // 두어야 devConfig 증분 동기화(sourceId == "dev" 필터·조회)에 함께 실린다. 항목 식별은 chunkKey 가 맡는다.
  data.devConfig.awards.forEach((item) =>
    chunks.push(
      chunk("development", "devAward", "dev", `award-${item.id}`, [
        item.year,
        localized(item.name),
        localized(item.place),
        localized(item.description),
      ]),
    ),
  );

  data.musicWorks.forEach((work) =>
    chunks.push(
      chunk("music", "musicWork", work.id, "work", [
        labeled("연주/Performance", localized(work.title)),
        localized(work.subtitle),
        localized(work.category),
        localized(work.venue),
        work.performedAt.toISOString().slice(0, 10),
        work.program.join(", "),
        localized(work.description),
      ]),
    ),
  );
  data.musicAwards.forEach((award) =>
    chunks.push(
      chunk("music", "musicAward", award.id, "award", [
        String(award.year),
        localized(award.name),
        award.place,
        localized(award.description),
      ]),
    ),
  );
  data.musicMedia.forEach((media) =>
    chunks.push(
      chunk("music", "musicMedia", media.id, "media", [
        localized(media.title),
        localized(media.source),
      ]),
    ),
  );
  data.musicConfig.career.forEach((item, index) =>
    chunks.push(
      chunk("music", "musicCareer", "music", `career-${index}`, [
        item.period,
        localized(item.title),
      ]),
    ),
  );
  data.musicConfig.education.forEach((item, index) =>
    chunks.push(
      chunk("music", "musicEducation", "music", `education-${index}`, [
        item.period,
        localized(item.title),
      ]),
    ),
  );

  const tagById = new Map(data.site.tags.map((tag) => [tag.id, `${tag.ko} / ${tag.en}`]));
  data.photos.forEach((photo) =>
    chunks.push(
      chunk("photography", "photo", photo.id, "photo", [
        labeled("사진/Photo", localized(photo.title)),
        labeled("장소/Place", localized(photo.place)),
        labeled("태그/Tags", photo.tags.map((id) => tagById.get(id) ?? id).join(", ")),
        photo.camera,
        photo.lens,
      ]),
    ),
  );
  data.albums.forEach((album) =>
    chunks.push(
      chunk("photography", "album", album.id, "album", [
        labeled("앨범/Album", localized(album.title)),
        localized(album.subtitle),
      ]),
    ),
  );

  return chunks.filter((item): item is RagChunk => Boolean(item));
};

export { buildRagChunks };
