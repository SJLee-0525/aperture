import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { DevAward } from "@/types/dev";

/** 구형 site/dev 문서의 수상에도 안정적인 ID와 새 필드 기본값을 채운다. */
const normalizeDevAwards = (value: unknown): DevAward[] => {
  if (!Array.isArray(value)) return [];

  const usedIds = new Set<string>();
  return value.map((item, index) => {
    const award = (item ?? {}) as Partial<DevAward>;
    const baseId = typeof award.id === "string" && award.id ? award.id : `dev-award-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);

    return {
      id,
      year: typeof award.year === "string" ? award.year : "",
      projectId: typeof award.projectId === "string" ? award.projectId : "",
      name: award.name ?? EMPTY_TEXT,
      place: award.place ?? EMPTY_TEXT,
      description: award.description ?? EMPTY_TEXT,
    };
  });
};

export { normalizeDevAwards };
