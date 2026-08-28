/**
 * 이탈 가드를 `<Link onNavigate>` 에 붙이는 형태로 바꾼다.
 *
 * 설정 편집기 다섯의 취소는 `AdminButton href=` 라 버튼이 아니라 링크다. 이동을 막으려면
 * 기본 동작을 취소해야 하고, 그 세 줄이 다섯 벌 같은 모양으로 있었다.
 *
 * @param confirmLeave 이동해도 되는지 묻는 함수.
 * @returns `onNavigate` 핸들러.
 */
const guardedNavigate =
  (confirmLeave: () => boolean) =>
  (event: { preventDefault: () => void }): void => {
    if (!confirmLeave()) event.preventDefault();
  };

export { guardedNavigate };
