import { asText } from "@/lib/i18n/as-text";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

import type { DevTroubleshooting } from "@/types/dev";

/**
 * 구형 평문 "문제 → 해결" 을 첫 화살표 기준으로 분리. 화살표 없으면 전부 problem.
 *
 * @param {string} text 분리할 레거시 문제·해결 문자열.
 * @returns {[string, string]} 문제와 해결 문자열 쌍.
 */
const splitAtArrow = (text: string): [string, string] => {
  const i = text.indexOf("→");
  return i < 0 ? [text.trim(), ""] : [text.slice(0, i).trim(), text.slice(i + 1).trim()];
};

/**
 * troubleshooting 필드 정규화 — 신형 {title,problem,solution,result?} 는 그대로,
 * 레거시 평문 {ko,en} 은 화살표 분리로 이행(재저장 전까지 공개 페이지 하위호환).
 * 관리자 클라 SDK(`lib/supabase/dev.ts`)와 공개 PostgREST(`lib/supabase/public/dev.ts`)
 * 디코더가 공유하는 순수 함수다. 한쪽에만 두면 두 경로의 하위호환 규칙이 갈린다.
 *
 * @param {unknown} value DB 에서 읽은 문제 해결 목록.
 * @returns {DevTroubleshooting[]} 현재 스키마로 정규화된 문제 해결 목록.
 */
const normalizeTroubleshooting = (value: unknown): DevTroubleshooting[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry): DevTroubleshooting => {
    if (entry == null || typeof entry !== "object") {
      return { title: EMPTY_TEXT, problem: EMPTY_TEXT, solution: EMPTY_TEXT };
    }
    const record = entry as Record<string, unknown>;
    if ("problem" in record || "title" in record || "solution" in record) {
      return {
        title: asText(record.title),
        problem: asText(record.problem),
        solution: asText(record.solution),
        ...(record.result != null ? { result: asText(record.result) } : {}),
      };
    }
    const legacy = asText(record);
    const [koProblem, koSolution] = splitAtArrow(legacy.ko);
    const [enProblem, enSolution] = splitAtArrow(legacy.en);
    return {
      title: EMPTY_TEXT,
      problem: { ko: koProblem, en: enProblem },
      solution: { ko: koSolution, en: enSolution },
    };
  });
};

export { normalizeTroubleshooting };
