import type { DevConfig, DevStackItem } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";

type Lang = keyof LocalizedText;
type MoveOffset = -1 | 1;
type InterviewField = "q" | "a";
type TimelineField = "title" | "role" | "desc";

type DevConfigEdit =
  | { type: "heroLead.edit"; lang: Lang; value: string }
  | { type: "interview.add" }
  | {
      type: "interview.edit";
      index: number;
      field: InterviewField;
      lang: Lang;
      value: string;
    }
  | { type: "interview.move"; index: number; offset: MoveOffset }
  | { type: "interview.remove"; index: number }
  | { type: "stack.group.add" }
  | { type: "stack.category.edit"; index: number; value: string }
  | { type: "stack.item.add"; index: number }
  | {
      type: "stack.item.edit";
      index: number;
      itemIndex: number;
      field: keyof DevStackItem;
      value: string;
    }
  | { type: "stack.item.remove"; index: number; itemIndex: number }
  | { type: "stack.group.move"; index: number; offset: MoveOffset }
  | { type: "stack.group.remove"; index: number }
  | { type: "timeline.add" }
  | { type: "timeline.period.edit"; index: number; value: string }
  | {
      type: "timeline.field.edit";
      index: number;
      field: TimelineField;
      lang: Lang;
      value: string;
    }
  | { type: "timeline.move"; index: number; offset: MoveOffset }
  | { type: "timeline.remove"; index: number };

const moveItem = <T>(list: T[], index: number, offset: MoveOffset): T[] => {
  const target = index + offset;
  if (target < 0 || target >= list.length) return list;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/** 관리자 개발 설정의 모든 편집 규칙. React·Firebase와 무관한 순수 command reducer. */
const editDevConfig = (config: DevConfig, edit: DevConfigEdit): DevConfig => {
  switch (edit.type) {
    case "heroLead.edit":
      return {
        ...config,
        heroLead: { ...config.heroLead, [edit.lang]: edit.value },
      };
    case "interview.add":
      return {
        ...config,
        interview: [...config.interview, { q: { ko: "", en: "" }, a: { ko: "", en: "" } }],
      };
    case "interview.edit":
      return {
        ...config,
        interview: config.interview.map((item, index) =>
          index === edit.index
            ? {
                ...item,
                [edit.field]: { ...item[edit.field], [edit.lang]: edit.value },
              }
            : item,
        ),
      };
    case "interview.move":
      return {
        ...config,
        interview: moveItem(config.interview, edit.index, edit.offset),
      };
    case "interview.remove":
      return {
        ...config,
        interview: config.interview.filter((_, index) => index !== edit.index),
      };
    case "stack.group.add":
      return {
        ...config,
        stack: [...config.stack, { category: "", items: [] }],
      };
    case "stack.category.edit":
      return {
        ...config,
        stack: config.stack.map((group, index) =>
          index === edit.index ? { ...group, category: edit.value } : group,
        ),
      };
    case "stack.item.add":
      return {
        ...config,
        stack: config.stack.map((group, index) =>
          index === edit.index
            ? {
                ...group,
                items: [...group.items, { name: "", bg: "#000000", fg: "#ffffff" }],
              }
            : group,
        ),
      };
    case "stack.item.edit":
      return {
        ...config,
        stack: config.stack.map((group, index) =>
          index === edit.index
            ? {
                ...group,
                items: group.items.map((item, itemIndex) =>
                  itemIndex === edit.itemIndex ? { ...item, [edit.field]: edit.value } : item,
                ),
              }
            : group,
        ),
      };
    case "stack.item.remove":
      return {
        ...config,
        stack: config.stack.map((group, index) =>
          index === edit.index
            ? {
                ...group,
                items: group.items.filter((_, itemIndex) => itemIndex !== edit.itemIndex),
              }
            : group,
        ),
      };
    case "stack.group.move":
      return {
        ...config,
        stack: moveItem(config.stack, edit.index, edit.offset),
      };
    case "stack.group.remove":
      return {
        ...config,
        stack: config.stack.filter((_, index) => index !== edit.index),
      };
    case "timeline.add":
      return {
        ...config,
        timeline: [
          ...config.timeline,
          {
            period: "",
            title: { ko: "", en: "" },
            role: { ko: "", en: "" },
            desc: { ko: "", en: "" },
          },
        ],
      };
    case "timeline.period.edit":
      return {
        ...config,
        timeline: config.timeline.map((entry, index) =>
          index === edit.index ? { ...entry, period: edit.value } : entry,
        ),
      };
    case "timeline.field.edit":
      return {
        ...config,
        timeline: config.timeline.map((entry, index) =>
          index === edit.index
            ? {
                ...entry,
                [edit.field]: {
                  ...entry[edit.field],
                  [edit.lang]: edit.value,
                },
              }
            : entry,
        ),
      };
    case "timeline.move":
      return {
        ...config,
        timeline: moveItem(config.timeline, edit.index, edit.offset),
      };
    case "timeline.remove":
      return {
        ...config,
        timeline: config.timeline.filter((_, index) => index !== edit.index),
      };
  }
};

export { editDevConfig };
export type { DevConfigEdit };
