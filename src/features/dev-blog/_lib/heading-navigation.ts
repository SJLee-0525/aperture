import { pushCurrentUrl } from "@/lib/navigation/replace-current-url";

/**
 * 목차 항목을 눌렀을 때 해당 heading 으로 이동하고 주소에 fragment 를 남긴다.
 *
 * 이동 전에 현재 history entry 에 스크롤 위치를 적어 둔다. 뒤로가기로 돌아왔을 때 브라우저가
 * fragment 만 보고 heading 자리로 다시 보내면 읽던 곳을 잃기 때문이다. 되돌리기는 `restoreScroll`
 * 이 그 값이 있을 때만 한다.
 *
 * 새 entry 에는 그 값을 **빼고** 넘긴다. `pushCurrentUrl` 의 기본값은 현재 state 를 그대로
 * 옮기므로, 방금 적은 `scrollY` 가 새 entry 에도 복사되면 앞으로 가기에서 heading 이 아니라
 * 누르기 전 위치로 되돌아간다.
 *
 * heading 에 프로그램적으로 포커스를 옮겨 화면 낭독기가 새 절의 제목부터 읽게 한다. 포커스
 * 링이 남지 않도록 `tabindex="-1"` 만 붙인다.
 *
 * @param {string} id 이동할 heading 의 id.
 * @returns {void} 해당 id 가 없으면 아무 일도 하지 않는다.
 */
const navigateToHeading = (id: string): void => {
  const heading = document.getElementById(id);
  if (!heading) return;

  const departing = window.history.state as Record<string, unknown> | null;
  window.history.replaceState({ ...departing, scrollY: window.scrollY }, "");
  pushCurrentUrl(`${window.location.pathname}${window.location.search}#${id}`, departing);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  heading.setAttribute("tabindex", "-1");
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
};

/**
 * 뒤로가기로 돌아왔을 때 저장해 둔 스크롤 위치를 되살린다.
 *
 * @param {PopStateEvent} event popstate 이벤트.
 * @returns {boolean} 복원했으면 true. 저장된 위치가 없으면 아무 일도 하지 않고 false.
 */
const restoreScroll = (event: PopStateEvent): boolean => {
  const saved = (event.state as { scrollY?: unknown } | null)?.scrollY;
  if (typeof saved !== "number") return false;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: saved, behavior: reduced ? "auto" : "smooth" });
  return true;
};

export { navigateToHeading, restoreScroll };
