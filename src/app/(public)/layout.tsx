/**
 * 공개(방문자) 레이아웃 — chrome(SiteHeader)은 Slice 1에서 여기에 마운트한다.
 * 현재 M0에서는 자식만 렌더.
 */
const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default PublicLayout;
