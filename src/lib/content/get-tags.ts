import { getSite } from "@/lib/content/get-site";
import type { Tag } from "@/types/tag";

/**
 * 태그 사전 — 필터 칩·사진 태그 라벨의 단일 출처. site/config.tags 에서 온다.
 * getSite() 파생 — 데이터 소스(REST↔mock)를 한 곳(get-site)에서만 관리한다.
 */
const getTags = async (): Promise<Tag[]> => (await getSite()).tags;

export { getTags };
