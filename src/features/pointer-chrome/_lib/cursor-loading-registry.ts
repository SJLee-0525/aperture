/** 대기 표시를 켜기까지 기다리는 시간. 짧은 이동에는 표시가 나오지 않는다. */
const SHOW_DELAY_MS = 150;
/** 해제 신호가 오지 않아도 표시를 걷는 시각. */
const SAFETY_MS = 10_000;

type CursorLoadingRegistry = {
  update: (id: string, active: boolean) => void;
  dispose: () => void;
};

/**
 * 여러 곳이 동시에 요청하는 대기 표시를 id 집합으로 센다.
 *
 * 하나라도 남아 있으면 표시를 켜고, 모두 해제되면 끈다. 해제 신호를 놓친 요청이 표시를
 * 영원히 켜 두지 않도록 안전 시각을 둔다.
 *
 * @param setLoading 표시 상태가 실제로 바뀔 때만 불린다.
 */
const createCursorLoadingRegistry = (
  setLoading: (next: boolean) => void,
): CursorLoadingRegistry => {
  const ids = new Set<string>();
  let delayTimer = 0;
  let safetyTimer = 0;
  let shown = false;

  const show = (next: boolean) => {
    if (next === shown) return;
    shown = next;
    setLoading(next);
  };

  const update = (id: string, active: boolean) => {
    if (active) ids.add(id);
    else ids.delete(id);

    window.clearTimeout(delayTimer);
    window.clearTimeout(safetyTimer);

    if (ids.size === 0) {
      show(false);
      return;
    }

    safetyTimer = window.setTimeout(() => {
      ids.clear();
      show(false);
    }, SAFETY_MS);
    if (shown) return;

    delayTimer = window.setTimeout(() => {
      if (ids.size === 0) return;
      show(true);
    }, SHOW_DELAY_MS);
  };

  const dispose = () => {
    window.clearTimeout(delayTimer);
    window.clearTimeout(safetyTimer);
  };

  return { update, dispose };
};

export { createCursorLoadingRegistry };
