/**
 * mock 단계에서 Firebase Storage 를 대신하는 브라우저 이미지 저장소.
 *
 * 업로드 파이프라인(EXIF 추출·webp 3단 압축)은 mock 에서도 실제로 돌고, 이 파일은 마지막
 * 압축한 이미지를 object URL로 보관해 미리보기와 폼 저장에 사용한다.
 * 객체 경로는 live Storage와 같은 형식을 사용한다.
 *
 * objectURL 은 탭이 살아 있는 동안만 유효하다. 새로고침하면 이미지가 끊어지며, 그 한계는
 * 관리자 mock 배지가 안내한다. 경로→URL 표는 메모리에만 두고, 삭제할 때
 * `URL.revokeObjectURL` 로 blob 메모리를 돌려준다.
 */

/** 객체 경로와 발급한 object URL의 대응표. */
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
 * mock 이미지를 지우고 연결된 object URL을 해제한다.
 * 현재 세션에서 만들지 않은 경로는 건너뛴다.
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
