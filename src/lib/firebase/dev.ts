import { doc, getDoc, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";

import { COLLECTIONS, SITE_DEV_DOC } from "@/constants/collections";
import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { db } from "@/lib/firebase/client";
import { listCrud } from "@/lib/firebase/list-crud";
import type { DevConfig, DevProject } from "@/types/dev";
import type { LocalizedText } from "@/types/localized";

const asText = (v: unknown): LocalizedText => (v as LocalizedText) ?? { ko: "", en: "" };

const toDevProject = (id: string, d: DocumentData): DevProject => ({
  id,
  title: asText(d.title),
  category: asText(d.category),
  year: d.year ?? "",
  summary: asText(d.summary),
  overview: asText(d.overview),
  roles: d.roles ?? [],
  troubleshooting: d.troubleshooting ?? [],
  techTags: d.techTags ?? [],
  links: d.links ?? [],
  cover: d.cover ?? null,
  images: d.images ?? [],
  order: d.order ?? 0,
  published: d.published ?? false,
});

const devProjects = listCrud<DevProject>(COLLECTIONS.DEV_PROJECTS, toDevProject, "프로젝트");

/**
 * site/dev 설정(소개 리드·인터뷰·스택·경력 등) 읽기/저장 — 단일 문서.
 * music/site 와 동일하게 "전체 로드 → 편집 → 전체 저장" 흐름.
 */
const getDevConfigAdmin = async (): Promise<DevConfig> => {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SITE, SITE_DEV_DOC));
    if (!snap.exists()) return EMPTY_DEV_CONFIG;
    const d = snap.data();
    return {
      heroLead: asText(d.heroLead),
      interview: d.interview ?? [],
      stack: d.stack ?? [],
      timeline: d.timeline ?? [],
    };
  } catch {
    throw new Error("개발 설정을 불러오지 못했습니다.");
  }
};

const updateDevConfig = async (config: DevConfig): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.SITE, SITE_DEV_DOC), {
      ...config,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("개발 설정 저장에 실패했습니다.");
  }
  requestPublicRevalidate();
};

type DevProjectInput = Omit<DevProject, "id">;

export { devProjects, getDevConfigAdmin, updateDevConfig };
export type { DevProjectInput };
