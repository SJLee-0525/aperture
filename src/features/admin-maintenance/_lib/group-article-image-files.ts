/** `dev-blog/` Storage 파일 하나 — 경로·공개 주소·크기·업로드 시각. */
type ArticleImageFile = { path: string; url: string; size: number; uploadedAt: Date };

/** 한 이미지의 원본·프리뷰·썸네일 한 벌. */
type ArticleImageGroup = {
  /** 원본·프리뷰·썸네일 순. 마지막 원소가 그룹에서 가장 작은 파생본이다. */
  files: ArticleImageFile[];
  /** 파일명이 아니라 업로드 시각으로 묶었다. 다른 이미지의 파생본이 섞여 있을 수 있다. */
  estimated: boolean;
};

/** 파생본 폴더 이름과 변형 종류. 업로더가 `previews/`·`thumbnails/` 하위 폴더를 쓴다. */
const VARIANT_BY_FOLDER = { previews: "preview", thumbnails: "thumbnail" } as const;

type Variant = "main" | "preview" | "thumbnail";

/** 정렬 순서. 원본이 먼저이고 마지막이 가장 작은 파생본이다. */
const VARIANT_ORDER: Variant[] = ["main", "preview", "thumbnail"];

/**
 * 파일명 asset ID 를 공유하지 않는 구형 파일을 묶을 때 허용하는 업로드 시각 차이.
 * 세 변형이 한 번의 병렬 업로드에서 나오므로 완료 시각이 이 안에 들어온다.
 */
const GROUP_WINDOW_MS = 60 * 1000;

const variantOf = (path: string): Variant => {
  const parent = path.split("/").at(-2) ?? "";
  return VARIANT_BY_FOLDER[parent as keyof typeof VARIANT_BY_FOLDER] ?? "main";
};

/** 글 문서별 폴더(`dev-blog/{articleId}`). 파생본 하위 폴더는 제외한다. */
const articleFolderOf = (path: string): string => path.split("/").slice(0, 2).join("/");

/** 확장자를 뺀 파일명. 업로더가 세 변형에 같은 값을 쓴다. */
const assetIdOf = (path: string): string => (path.split("/").at(-1) ?? "").replace(/\.[^.]+$/, "");

const orderByVariant = (files: ArticleImageFile[]): ArticleImageFile[] =>
  [...files].sort(
    (a, b) => VARIANT_ORDER.indexOf(variantOf(a.path)) - VARIANT_ORDER.indexOf(variantOf(b.path)),
  );

/**
 * 같은 글 폴더 안에서 파일명 asset ID 가 같은 파일끼리 묶는다.
 * asset ID 는 UUID 라 서로 다른 이미지가 한 그룹에 들어가지 않는다.
 */
const groupByAssetId = (files: ArticleImageFile[]): Map<string, ArticleImageFile[]> => {
  const byAsset = new Map<string, ArticleImageFile[]>();
  for (const file of files) {
    const key = `${articleFolderOf(file.path)}/${assetIdOf(file.path)}`;
    const members = byAsset.get(key);
    if (members) members.push(file);
    else byAsset.set(key, [file]);
  }
  return byAsset;
};

type OpenGroup = { members: ArticleImageFile[]; variants: Set<Variant>; startedAt: number };

/**
 * asset ID 를 공유하지 않는 구형 파일을 업로드 시각으로 묶는다.
 * 같은 글 폴더에서 이른 순으로 훑으며, 그 변형이 아직 비어 있고 시작 시각에서 1분 안에 있는
 * 가장 오래된 그룹에 넣는다.
 */
const groupByUploadTime = (files: ArticleImageFile[]): ArticleImageFile[][] => {
  const byFolder = new Map<string, OpenGroup[]>();
  const ordered = [...files].sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());

  for (const file of ordered) {
    const folder = articleFolderOf(file.path);
    const variant = variantOf(file.path);
    let groups = byFolder.get(folder);
    if (!groups) {
      groups = [];
      byFolder.set(folder, groups);
    }

    const target = groups.find(
      (group) =>
        !group.variants.has(variant) &&
        file.uploadedAt.getTime() - group.startedAt <= GROUP_WINDOW_MS,
    );
    if (target) {
      target.members.push(file);
      target.variants.add(variant);
      continue;
    }
    groups.push({
      members: [file],
      variants: new Set([variant]),
      startedAt: file.uploadedAt.getTime(),
    });
  }

  return [...byFolder.values()].flat().map((group) => group.members);
};

/** 그룹에서 가장 이른 업로드 시각. 표시와 정렬의 기준이다. */
const groupStartedAt = (group: ArticleImageGroup): number =>
  Math.min(...group.files.map((file) => file.uploadedAt.getTime()));

/**
 * `dev-blog/` 파일을 이미지 단위로 묶는다. 참조 여부는 보지 않는다.
 *
 * 파일명 asset ID 를 공유하는 파일끼리 먼저 묶는다. 이 묶음은 확정이다. 짝을 찾지 못한 구형
 * 파일만 업로드 시각으로 묶고 `estimated` 를 세운다. 시각으로 묶은 그룹은 두 이미지를 연달아
 * 올려 업로드 완료 순서가 엇갈리면 다른 이미지의 파생본을 담을 수 있다.
 *
 * @param {ArticleImageFile[]} files `dev-blog/` 아래 파일 전체.
 * @returns {ArticleImageGroup[]} 업로드가 이른 순으로 정렬한 이미지 단위 그룹.
 */
const groupArticleImageFiles = (files: ArticleImageFile[]): ArticleImageGroup[] => {
  const exact: ArticleImageFile[][] = [];
  const unpaired: ArticleImageFile[] = [];
  for (const members of groupByAssetId(files).values()) {
    if (members.length > 1) exact.push(members);
    else unpaired.push(...members);
  }

  return [
    ...exact.map((members) => ({ files: orderByVariant(members), estimated: false })),
    // 파일 하나뿐인 그룹은 짝지을 대상이 없어 추정이 아니다.
    ...groupByUploadTime(unpaired).map((members) => ({
      files: orderByVariant(members),
      estimated: members.length > 1,
    })),
  ].sort((a, b) => groupStartedAt(a) - groupStartedAt(b));
};

export { groupArticleImageFiles, groupStartedAt };
export type { ArticleImageGroup };
