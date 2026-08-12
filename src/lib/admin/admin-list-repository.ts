/**
 * 목록 컬렉션 관리자 저장소의 공용 계약.
 *
 * 화면(훅·페이지)은 이 타입만 보고, mock(브라우저 로컬)과 live(Firestore + REST projection)
 * 구현이 같은 모양을 강제받는다 — B3 블로그에서 세운 "화면은 저장소의 정체를 모른다"는
 * 경계를 나머지 관리자 도메인으로 넓힌 것이다. `list` 는 목록 행 투영만, `get` 은 편집에
 * 필요한 전체 문서를 돌려준다. Firestore 로 바뀌어도 읽는 양이 그대로여야 한다.
 */
type AdminListRepository<TEntity extends { id: string }, TListItem> = {
  /** 새 문서 ID를 미리 발급한다. 이미지 Storage 경로를 저장 전에 정하기 위해 필요하다. */
  newId: () => string;
  list: () => Promise<TListItem[]>;
  get: (id: string) => Promise<TEntity | null>;
  create: (id: string, input: Omit<TEntity, "id">) => Promise<void>;
  update: (id: string, input: Omit<TEntity, "id">) => Promise<void>;
  updateOrder: (id: string, order: number) => Promise<void>;
  setPublished: (id: string, published: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export type { AdminListRepository };
