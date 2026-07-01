import { MOCK_SITE } from "@/mocks/site";
import type { Tag } from "@/types/tag";

/** 태그 사전 — 필터 칩·사진 태그 라벨의 단일 출처. site/config.tags 에서 온다. */
const getTags = async (): Promise<Tag[]> => MOCK_SITE.tags;

export { getTags };
