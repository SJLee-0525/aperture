const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, [data-cursor-target]';
const TEXT_SELECTOR = [
  "input:not([type])",
  'input[type="text"]',
  'input[type="search"]',
  'input[type="email"]',
  'input[type="url"]',
  'input[type="tel"]',
  'input[type="password"]',
  "textarea",
  '[contenteditable="true"]',
].join(", ");
const RANGE_CONTROL_SELECTOR = 'input[type="range"]';
const PASSIVE_CURSOR_SELECTOR = "[data-cursor-passive]";
const CUSTOM_SCROLLBAR_SELECTOR = "[data-custom-scrollbar-ui]";
/**
 * 브라우저가 커서를 직접 그리는 영역 — 커스텀 커서를 숨기고 기본 커서에 넘긴다.
 * iframe 이 여기 포함되는 이유: 교차 출처 문서라 부모의 `cursor: none` 이 안으로 닿지 않고,
 * pointermove 도 경계를 넘지 못한다. 넘기지 않으면 커스텀 커서가 iframe 경계에 굳은 채
 * 안에서는 기본 화살표가 따로 움직여 커서가 둘로 보인다. (hCaptcha·YouTube 임베드 공통)
 */
const NATIVE_CONTROL_SELECTOR = 'input[type="checkbox"], input[type="radio"], select, iframe';

type CursorTargetKind =
  "interactive" | "native" | "passive" | "range" | "scrollbar" | "text" | "none";

type CursorTarget = {
  element: Element | null;
  kind: CursorTargetKind;
  snapTarget: HTMLElement | null;
};

/** 포인터 아래 DOM을 커서가 이해하는 한 가지 target으로 정규화한다. */
const resolveCursorTarget = (eventTarget: EventTarget | null): CursorTarget => {
  const element = eventTarget instanceof Element ? eventTarget : null;
  if (!element) return { element: null, kind: "none", snapTarget: null };

  const scrollbar = element.closest(CUSTOM_SCROLLBAR_SELECTOR);
  if (scrollbar) return { element: scrollbar, kind: "scrollbar", snapTarget: null };

  const text = element.closest(TEXT_SELECTOR);
  if (text) return { element: text, kind: "text", snapTarget: null };

  const range = element.closest(RANGE_CONTROL_SELECTOR);
  if (range) return { element: range, kind: "range", snapTarget: null };

  const passive = element.closest(PASSIVE_CURSOR_SELECTOR);
  if (passive) return { element: passive, kind: "passive", snapTarget: null };

  const native = element.closest(NATIVE_CONTROL_SELECTOR);
  if (native) return { element: native, kind: "native", snapTarget: null };

  const interactive = element.closest<HTMLElement>(INTERACTIVE_SELECTOR);
  return {
    element: interactive ?? element,
    kind: interactive ? "interactive" : "none",
    snapTarget: interactive,
  };
};

export { resolveCursorTarget };
