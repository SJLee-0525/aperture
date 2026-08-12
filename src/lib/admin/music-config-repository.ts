import { EMPTY_MUSIC_CONFIG } from "@/constants/empty-configs";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { createLocalDocRepository } from "@/lib/admin/mock/local-doc-repository";
import { selectRepository } from "@/lib/admin/select-repository";
import { getMusicConfigAdmin, updateMusicConfig } from "@/lib/firebase/music";

import type { MusicConfig } from "@/types/music";

/**
 * `site/music` 관리자 저장소. 이 문서는 음악 설정 화면 하나가 통째로 소유하므로
 * live 와 같은 "전체 로드 → 편집 → 전체 저장" 흐름(`set`)만 있으면 된다.
 */
type MusicConfigRepository = {
  get: () => Promise<MusicConfig>;
  set: (config: MusicConfig) => Promise<void>;
};

/** 저장 형식 버전 — `MusicConfig` 필드 계약이 바뀌면 올린다. */
const STORE_VERSION = 1;

/**
 * 현재 콘텐츠 소스에 맞는 site/music 저장소. 첫 호출 결과를 재사용한다.
 *
 * @returns {MusicConfigRepository} mock 이면 브라우저 로컬, live 면 Firestore 구현.
 */
const getMusicConfigRepository = selectRepository<MusicConfigRepository>(
  () => {
    const doc = createLocalDocRepository<MusicConfig>({
      key: STORAGE_KEYS.ADMIN_MUSIC_CONFIG,
      version: STORE_VERSION,
      label: "음악 설정",
      seed: async () => ({ ...(await import("@/mocks/music")).MOCK_MUSIC_CONFIG }),
      emptyDoc: EMPTY_MUSIC_CONFIG,
      getStorage: () => window.localStorage,
    });
    return { get: doc.get, set: doc.set };
  },
  () => ({ get: getMusicConfigAdmin, set: updateMusicConfig }),
);

export { getMusicConfigRepository };
