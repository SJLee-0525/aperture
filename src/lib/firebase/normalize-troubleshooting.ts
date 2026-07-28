import type { DevTroubleshooting } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";

const EMPTY: LocalizedText = { ko: "", en: "" };

const asLocalized = (v: unknown): LocalizedText => {
  const r = (v ?? {}) as Record<string, unknown>;
  return { ko: typeof r.ko === "string" ? r.ko : "", en: typeof r.en === "string" ? r.en : "" };
};

/** 구형 평문 "문제 → 해결" 을 첫 화살표 기준으로 분리. 화살표 없으면 전부 problem. */
const splitAtArrow = (text: string): [string, string] => {
  const i = text.indexOf("→");
  return i < 0 ? [text.trim(), ""] : [text.slice(0, i).trim(), text.slice(i + 1).trim()];
};

/**
 * troubleshooting 필드 정규화 — 신형 {title,problem,solution,result?} 는 그대로,
 * 레거시 평문 {ko,en} 은 화살표 분리로 이행(재저장 전까지 공개 페이지 하위호환).
 * 클라 SDK(dev.ts)·REST(firestore-rest.ts) 디코더 양쪽이 공유하는 순수 함수 — firebase import 금지.
 */
const normalizeTroubleshooting = (value: unknown): DevTroubleshooting[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry): DevTroubleshooting => {
    if (entry == null || typeof entry !== "object") {
      return { title: EMPTY, problem: EMPTY, solution: EMPTY };
    }
    const record = entry as Record<string, unknown>;
    if ("problem" in record || "title" in record || "solution" in record) {
      return {
        title: asLocalized(record.title),
        problem: asLocalized(record.problem),
        solution: asLocalized(record.solution),
        ...(record.result != null ? { result: asLocalized(record.result) } : {}),
      };
    }
    const legacy = asLocalized(record);
    const [koProblem, koSolution] = splitAtArrow(legacy.ko);
    const [enProblem, enSolution] = splitAtArrow(legacy.en);
    return {
      title: EMPTY,
      problem: { ko: koProblem, en: enProblem },
      solution: { ko: koSolution, en: enSolution },
    };
  });
};

export { normalizeTroubleshooting };
