import { objectParticle } from "@/lib/i18n/korean-particle";

type DeleteTarget = {
  /** 관리자가 목록에서 본 그 이름. 행 제목과 같은 값을 넘긴다. */
  name: string;
  /** 대상 종류. 목적격 조사는 이 말의 받침이 정한다. */
  noun: string;
  /** 덧붙일 경고. 되돌릴 수 없거나 함께 지워지지 않는 것이 있을 때만 쓴다. */
  note?: string;
};

/**
 * 삭제 확인 문구.
 *
 * 문구를 호출부마다 적으면 같은 파괴 동작인데 경고 강도가 갈린다. 실제로 열한 곳 중
 * 둘만 결과 문장을 갖고 있었다.
 *
 * @param target 이름·대상 종류·덧붙일 경고.
 * @returns 확인창에 띄울 문구.
 */
const deleteMessage = ({ name, noun, note }: DeleteTarget): string =>
  `"${name}" ${noun}${objectParticle(noun)} 삭제할까요?${note ? ` ${note}` : ""}`;

/**
 * 확인을 통과했을 때만 실행한다.
 *
 * @param target 확인 문구의 재료.
 * @param remove 확인을 통과하면 부를 삭제 동작.
 */
const confirmThenDelete = (target: DeleteTarget, remove: () => void): void => {
  if (window.confirm(deleteMessage(target))) remove();
};

export { confirmThenDelete, deleteMessage };
export type { DeleteTarget };
