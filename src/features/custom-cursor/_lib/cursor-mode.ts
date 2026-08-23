type CursorMode =
  | "dot"
  | "ring"
  | "scroll"
  | "autoscroll"
  | "snap"
  | "text"
  | "range"
  | "scrollbar"
  | "frame"
  | "link"
  | "loading";

type CursorGeometry = { width: string; height: string; radius: string };
type ScrollbarAxis = "horizontal" | "vertical";

const CURSOR_GEOMETRY: Partial<Record<CursorMode, CursorGeometry>> = {
  dot: { width: "12px", height: "12px", radius: "999px" },
  ring: { width: "34px", height: "34px", radius: "999px" },
  scroll: { width: "18px", height: "28px", radius: "9px" },
  autoscroll: { width: "24px", height: "24px", radius: "999px" },
  text: { width: "4px", height: "24px", radius: "999px" },
  range: { width: "34px", height: "18px", radius: "999px" },
  scrollbar: { width: "20px", height: "28px", radius: "999px" },
  link: { width: "30px", height: "30px", radius: "999px" },
  loading: { width: "22px", height: "22px", radius: "999px" },
};

const HORIZONTAL_SCROLLBAR_GEOMETRY: CursorGeometry = {
  width: "28px",
  height: "20px",
  radius: "999px",
};

const applyCursorGeometry = (
  cursor: HTMLElement,
  mode: CursorMode,
  scrollbarAxis: ScrollbarAxis = "vertical",
): void => {
  const geometry =
    mode === "scrollbar" && scrollbarAxis === "horizontal"
      ? HORIZONTAL_SCROLLBAR_GEOMETRY
      : CURSOR_GEOMETRY[mode];
  if (!geometry) return;
  cursor.style.setProperty("--cursor-width", geometry.width);
  cursor.style.setProperty("--cursor-height", geometry.height);
  cursor.style.setProperty("--cursor-radius", geometry.radius);
};

export { applyCursorGeometry };
export type { CursorMode, ScrollbarAxis };
