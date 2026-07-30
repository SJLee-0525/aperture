const CUSTOM_CURSOR_MAP_HOVER_EVENT = "aperture:custom-cursor-map-hover";

const setMapCursorHover = (active: boolean) => {
  window.dispatchEvent(
    new CustomEvent<boolean>(CUSTOM_CURSOR_MAP_HOVER_EVENT, {
      detail: active,
    }),
  );
};

export { CUSTOM_CURSOR_MAP_HOVER_EVENT, setMapCursorHover };
