import type { DevProject, DevTroubleshooting } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";

import { hasText } from "@/lib/i18n/has-text";
import type { DevProjectInput } from "@/lib/firebase/dev";
import { EMPTY_TEXT } from "@/lib/i18n/empty-text";

const emptyProjectInput = (): DevProjectInput => ({
  title: EMPTY_TEXT,
  category: EMPTY_TEXT,
  year: "",
  period: EMPTY_TEXT,
  position: EMPTY_TEXT,
  summary: EMPTY_TEXT,
  overview: EMPTY_TEXT,
  features: [],
  roles: [],
  troubleshooting: [],
  achievements: [],
  techTags: [],
  links: [],
  cover: null,
  images: [],
  order: 0,
  published: false,
});

const projectToInput = (project: DevProject): DevProjectInput => {
  const { id: _id, ...input } = project;
  void _id;
  return input;
};

const cleanTroubleshooting = (items: DevTroubleshooting[]): DevTroubleshooting[] =>
  items
    .filter(
      (item) =>
        hasText(item.title) ||
        hasText(item.problem) ||
        hasText(item.solution) ||
        (item.result != null && hasText(item.result)),
    )
    .map(({ title, problem, solution, result }) => ({
      title,
      problem,
      solution,
      ...(result != null && hasText(result) ? { result } : {}),
    }));

const prepareProjectInput = (form: DevProjectInput): DevProjectInput => {
  const cleanLocalized = (items: LocalizedText[]) => items.filter(hasText);
  return {
    ...form,
    features: cleanLocalized(form.features),
    roles: cleanLocalized(form.roles),
    troubleshooting: cleanTroubleshooting(form.troubleshooting),
    achievements: cleanLocalized(form.achievements),
    techTags: form.techTags.map((tag) => tag.trim()).filter(Boolean),
    links: form.links.filter((link) => link.label.trim() || link.href.trim()),
  };
};

export { emptyProjectInput, prepareProjectInput, projectToInput };
