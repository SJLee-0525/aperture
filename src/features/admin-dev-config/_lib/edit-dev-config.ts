import { moveItem } from "@/lib/collection/move-item";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";


import type { DevConfig, DevStackItem } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";

type Lang = keyof LocalizedText;
type MoveOffset = -1 | 1;
type InterviewField = "q" | "a";
type TimelineField = "title" | "role" | "desc";
type AwardField = "name" | "place" | "description";

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
  | { type: "timeline.remove"; index: number }
  | { type: "education.add" }
  | { type: "education.period.edit"; index: number; value: string }
  | { type: "education.title.edit"; index: number; lang: Lang; value: string }
  | { type: "education.move"; index: number; offset: MoveOffset }
  | { type: "education.remove"; index: number }
  | { type: "award.add"; id: string }
  | { type: "award.year.edit"; index: number; value: string }
  | { type: "award.project.edit"; index: number; value: string }
  | { type: "award.field.edit"; index: number; field: AwardField; lang: Lang; value: string }
  | { type: "award.move"; index: number; offset: MoveOffset }
  | { type: "award.remove"; index: number };

/**
 * 관리자 개발 설정의 모든 편집 규칙. React·저장소와 무관한 순수 command reducer.
 *
 * @param {DevConfig} config
 * @param {DevConfigEdit} edit
 * @returns {DevConfig}
 */
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
        interview: [...config.interview, { q: EMPTY_TEXT, a: EMPTY_TEXT }],
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
            title: EMPTY_TEXT,
            role: EMPTY_TEXT,
            desc: EMPTY_TEXT,
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
    case "education.add":
      return {
        ...config,
        education: [...config.education, { period: "", title: EMPTY_TEXT }],
      };
    case "education.period.edit":
      return {
        ...config,
        education: config.education.map((entry, index) =>
          index === edit.index ? { ...entry, period: edit.value } : entry,
        ),
      };
    case "education.title.edit":
      return {
        ...config,
        education: config.education.map((entry, index) =>
          index === edit.index
            ? { ...entry, title: { ...entry.title, [edit.lang]: edit.value } }
            : entry,
        ),
      };
    case "education.move":
      return { ...config, education: moveItem(config.education, edit.index, edit.offset) };
    case "education.remove":
      return {
        ...config,
        education: config.education.filter((_, index) => index !== edit.index),
      };
    case "award.add":
      return {
        ...config,
        awards: [
          ...config.awards,
          {
            id: edit.id,
            year: "",
            projectId: "",
            name: EMPTY_TEXT,
            place: EMPTY_TEXT,
            description: EMPTY_TEXT,
          },
        ],
      };
    case "award.year.edit":
      return {
        ...config,
        awards: config.awards.map((award, index) =>
          index === edit.index ? { ...award, year: edit.value } : award,
        ),
      };
    case "award.field.edit":
      return {
        ...config,
        awards: config.awards.map((award, index) =>
          index === edit.index
            ? { ...award, [edit.field]: { ...award[edit.field], [edit.lang]: edit.value } }
            : award,
        ),
      };
    case "award.project.edit":
      return {
        ...config,
        awards: config.awards.map((award, index) =>
          index === edit.index ? { ...award, projectId: edit.value } : award,
        ),
      };
    case "award.move":
      return { ...config, awards: moveItem(config.awards, edit.index, edit.offset) };
    case "award.remove":
      return { ...config, awards: config.awards.filter((_, index) => index !== edit.index) };
  }
};

export { editDevConfig };
export type { DevConfigEdit };
