/**
 * 자식 세그먼트가 여럿인 부모 라우트의 loading 경계가 쓰는 자리표시자.
 *
 * 이 경계는 부모의 자식 슬롯이 바뀔 때 뜨므로 목적지가 목록일 수도 상세일 수도 있다.
 * 특정 지면의 셸을 그리면 절반의 이동에서 틀린 모양이 되므로 아무것도 그리지 않는다.
 * 높이는 상위 `#page-content` 가 뷰포트만큼 예약해 푸터가 밀려 올라오지 않는다.
 *
 * @returns {JSX.Element}
 */
const PageLoadingPlaceholder = () => <main aria-busy="true" />;

export { PageLoadingPlaceholder };
