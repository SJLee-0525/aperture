const CUSTOM_CURSOR_MAP_HOVER_EVENT = "aperture:custom-cursor-map-hover";
const CUSTOM_CURSOR_LOADING_EVENT = "aperture:custom-cursor-loading";

type CursorLoadingDetail = {
  id: string;
  active: boolean;
};

const setMapCursorHover = (active: boolean) => {
  window.dispatchEvent(
    new CustomEvent<boolean>(CUSTOM_CURSOR_MAP_HOVER_EVENT, {
      detail: active,
    }),
  );
};

const setCursorLoading = (id: string, active: boolean) => {
  window.dispatchEvent(
    new CustomEvent<CursorLoadingDetail>(CUSTOM_CURSOR_LOADING_EVENT, {
      detail: { id, active },
    }),
  );
};

export {
  CUSTOM_CURSOR_LOADING_EVENT,
  CUSTOM_CURSOR_MAP_HOVER_EVENT,
  setCursorLoading,
  setMapCursorHover,
  type CursorLoadingDetail,
};
