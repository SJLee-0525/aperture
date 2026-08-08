import { doc, getDoc, serverTimestamp, setDoc, type DocumentData } from "firebase/firestore";

import { COLLECTIONS, SITE_DEV_DOC } from "@/constants/collections";
import { firestoreDocumentCacheTag } from "@/constants/cache";
import { EMPTY_DEV_CONFIG } from "@/constants/empty-configs";

import { requestRagSync } from "@/lib/ai/request-rag-sync";
import { requestPublicRevalidate } from "@/lib/cache/request-revalidate";
import { db } from "@/lib/firebase/client";
import { listCrud } from "@/lib/firebase/list-crud";
import { normalizeDevAwards } from "@/lib/firebase/normalize-dev-awards";
import { normalizeTroubleshooting } from "@/lib/firebase/normalize-troubleshooting";
import { deleteDevProjectImages } from "@/lib/firebase/storage";
import { asText } from "@/lib/i18n/as-text";

import type { DevConfig, DevProject } from "@/types/dev";

/**
 * 개발 프로젝트 문서의 다국어 필드와 배열 기본값을 정규화한다.
 *
 * @param {string} id Firestore 프로젝트 문서 ID.
 * @param {DocumentData} d Firestore에서 읽은 프로젝트 문서 필드.
 * @returns {DevProject} 관리자 화면에서 사용하는 프로젝트 모델.
 */
const toDevProject = (id: string, d: DocumentData): DevProject => ({
  id,
  title: asText(d.title),
  category: asText(d.category),
  year: d.year ?? "",
  period: asText(d.period),
  position: asText(d.position),
  summary: asText(d.summary),
  overview: asText(d.overview),
  features: d.features ?? [],
  roles: d.roles ?? [],
  troubleshooting: normalizeTroubleshooting(d.troubleshooting),
  achievements: d.achievements ?? [],
  techTags: d.techTags ?? [],
  links: d.links ?? [],
  cover: d.cover ?? null,
  images: d.images ?? [],
  order: d.order ?? 0,
  published: d.published ?? false,
});

const devProjectsCrud = listCrud<DevProject>(
  COLLECTIONS.DEV_PROJECTS,
  toDevProject,
  "프로젝트",
  "project",
);
const devProjects = {
  ...devProjectsCrud,
  /**
   * 프로젝트 문서를 삭제한 뒤 해당 프로젝트의 Storage 이미지도 정리한다.
   *
   * @param {string} id 삭제할 프로젝트 문서 ID.
   * @returns {Promise<void>} 문서 삭제와 이미지 정리가 끝나면 완료된다.
   */
  remove: async (id: string): Promise<void> => {
    await devProjectsCrud.remove(id);
    await deleteDevProjectImages(id).catch(() => undefined);
  },
};

/**
 * 소개 문구, 인터뷰, 기술 스택과 이력을 담은 개발 설정 문서를 읽는다.
 *
 * @returns {Promise<DevConfig>} 저장된 설정. 문서가 없으면 빈 설정을 반환한다.
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
      education: d.education ?? [],
      timeline: d.timeline ?? [],
      awards: normalizeDevAwards(d.awards),
    };
  } catch {
    throw new Error("개발 설정을 불러오지 못했습니다.");
  }
};

/**
 * 개발 설정 문서 전체를 저장하고 공개 캐시와 RAG 문서를 갱신한다.
 *
 * @param {DevConfig} config 저장할 개발 소개와 이력 설정.
 * @returns {Promise<void>} 저장과 RAG 동기화가 끝나면 완료된다.
 */
const updateDevConfig = async (config: DevConfig): Promise<void> => {
  try {
    await setDoc(doc(db, COLLECTIONS.SITE, SITE_DEV_DOC), {
      ...config,
      updatedAt: serverTimestamp(),
    });
  } catch {
    throw new Error("개발 설정 저장에 실패했습니다.");
  }
  requestPublicRevalidate(firestoreDocumentCacheTag(COLLECTIONS.SITE, SITE_DEV_DOC));
  await requestRagSync("devConfig", SITE_DEV_DOC);
};

/** 새 프로젝트를 저장할 때 사용하는 문서 ID 제외 입력값. */
type DevProjectInput = Omit<DevProject, "id">;

export { devProjects, getDevConfigAdmin, updateDevConfig };
export type { DevProjectInput };
