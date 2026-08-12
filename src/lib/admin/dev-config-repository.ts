import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalDocRepository } from "@/lib/admin/mock/local-doc-repository";
import { selectRepository } from "@/lib/admin/select-repository";
import { getDevConfigAdmin, updateDevConfig } from "@/lib/firebase/dev";

import type { DevConfig } from "@/types/dev";

/**
 * `site/dev` 관리자 저장소. 이 문서는 개발 설정 화면 하나가 통째로 소유하므로
 * live 와 같은 "전체 로드 → 편집 → 전체 저장" 흐름(`set`)만 있으면 된다.
 */
type DevConfigRepository = {
  get: () => Promise<DevConfig>;
  set: (config: DevConfig) => Promise<void>;
};

/** 저장 형식 버전 — `DevConfig` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 현재 콘텐츠 소스에 맞는 site/dev 저장소. 첫 호출 결과를 재사용한다.
 *
 * @returns {DevConfigRepository} mock 이면 브라우저 로컬, live 면 Firestore 구현.
 */
const getDevConfigRepository = selectRepository<DevConfigRepository>(
  () => {
    const doc = createLocalDocRepository<DevConfig>({
      key: STORAGE_KEYS.ADMIN_DEV_CONFIG,
      version: STORE_VERSION,
      label: "개발 설정",
      seed: async () => ({ ...(await import("@/mocks/dev")).MOCK_DEV_CONFIG }),
      getStorage: () => window.localStorage,
    });
    return { get: doc.get, set: doc.set };
  },
  () => ({ get: getDevConfigAdmin, set: updateDevConfig }),
);

export { getDevConfigRepository };
