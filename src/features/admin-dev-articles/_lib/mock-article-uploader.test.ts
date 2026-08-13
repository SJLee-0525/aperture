import { describe, expect, it } from "vitest";

import { imageMarkdown } from "@/features/admin-dev-articles/_lib/markdown-insert";
import { createMockArticleImageUploader } from "@/features/admin-dev-articles/_lib/mock-article-uploader";
import { parseArticleMarkdown } from "@/features/dev-blog/_lib/markdown-parse";

import { STORAGE_IMAGE_HOSTS } from "@/constants/security-headers";

const file = (name: string) => new File([], name, { type: "image/png" });

describe("createMockArticleImageUploader", () => {
  it("글 폴더 아래 경로를 만든다", async () => {
    const upload = createMockArticleImageUploader("a1");
    const image = await upload(file("스크린샷.PNG"));

    expect(image.path).toMatch(/^dev-blog\/a1\/1-[a-z0-9-]*\.webp$/);
  });

  it("같은 글에 여러 장을 올려도 경로가 겹치지 않는다", async () => {
    const upload = createMockArticleImageUploader("a1");
    const [first, second] = [await upload(file("a.png")), await upload(file("a.png"))];

    expect(first.path).not.toBe(second.path);
  });

  it("허용 호스트 아래 주소를 준다", async () => {
    const image = await createMockArticleImageUploader("a1")(file("a.png"));

    expect(image.url.startsWith(STORAGE_IMAGE_HOSTS[0])).toBe(true);
  });

  it("만든 주소가 본문 이미지 검증을 통과한다", async () => {
    const image = await createMockArticleImageUploader("a1")(file("a.png"));
    const { issues, document } = parseArticleMarkdown(imageMarkdown(image.url, "설명"));

    expect(issues).toEqual([]);
    expect(document.blocks[0]).toMatchObject({ type: "image", src: image.url });
  });

  it("이름에 쓸 글자가 없어도 경로를 만든다", async () => {
    const image = await createMockArticleImageUploader("a1")(file("한글이름.png"));

    expect(image.path).toBe("dev-blog/a1/1-image.webp");
  });

  it("카드가 쓸 크기를 채워 준다", async () => {
    const image = await createMockArticleImageUploader("a1")(file("a.png"));

    expect(image.w).toBeGreaterThan(0);
    expect(image.h).toBeGreaterThan(0);
  });
});
