/**
 * mock 단계에서 Firebase Storage 를 대신하는 브라우저 이미지 저장소.
 *
 * 업로드 파이프라인(EXIF 추출·webp 3단 압축)은 mock 에서도 실제로 돌고, 이 파일은 마지막
 * 저장 호출만 바꾼다 — 압축본을 `URL.createObjectURL` 로 붙들어 미리보기와 폼 저장이
 * 실제 흐름 그대로 이어지게 한다. 경로 규칙(`photos/{id}/…` 등)은 live(`lib/firebase/storage`)와
 * 같은 모양을 유지한다. 저장 문서가 경로를 참조하는 계약이 mock 에서도 깨지지 않아야
 * B5 전환 때 문서 형태가 그대로다.
 *
 * objectURL 은 탭이 살아 있는 동안만 유효하다. 새로고침하면 이미지가 끊어지며, 그 한계는
 * 관리자 mock 배지가 안내한다. 경로→URL 표는 메모리에만 두고, 삭제할 때
 * `URL.revokeObjectURL` 로 blob 메모리를 돌려준다.
 */

/** 발급한 objectURL 의 경로 색인 — 폴더 삭제와 revoke 가 이 표를 본다. */
const urlsByPath = new Map<string, string>();

/**
 * 압축한 이미지를 mock 저장소에 올린다.
 *
 * @param {string} folder live 와 같은 규칙의 Storage 폴더(예: `photos/{id}`).
 * @param {Blob} blob 업로드할 WebP 이미지 데이터.
 * @returns {{ url: string; path: string }} objectURL 과 live 형식의 객체 경로.
 */
const uploadMockImage = (folder: string, blob: Blob): { url: string; path: string } => {
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const url = URL.createObjectURL(blob);
  urlsByPath.set(path, url);
  return { url, path };
};

/**
 * 경로 여러 개의 mock 이미지를 지우고 objectURL 을 회수한다.
 * 모르는 경로(이전 세션·mock seed 의 원격 URL)는 조용히 넘긴다 — live 의
 * object-not-found 허용과 같은 태도다.
 *
 * @param {Iterable<string>} paths 지울 객체 경로 모음.
 * @returns {void}
 */
const deleteMockImages = (paths: Iterable<string>): void => {
  for (const path of paths) {
    const url = urlsByPath.get(path);
    if (!url) continue;
    URL.revokeObjectURL(url);
    urlsByPath.delete(path);
  }
};

/**
 * 폴더 아래의 mock 이미지를 전부 지운다. 문서 삭제 후 이미지 정리
 * (live 의 `deletePhotoImages` 등)와 같은 자리다.
 *
 * @param {string} folder 지울 폴더 경로(예: `photos/{id}`).
 * @returns {void}
 */
const deleteMockImageFolder = (folder: string): void => {
  const prefix = `${folder}/`;
  deleteMockImages([...urlsByPath.keys()].filter((path) => path.startsWith(prefix)));
};

export { deleteMockImageFolder, deleteMockImages, uploadMockImage };
