import type { ReactNode } from "react";

import styles from "./PageToolbar.module.css";

type Props = {
  title: string;
  count?: string;
  children?: ReactNode;
};

/**
 * 목록 지면 상단의 제목 줄 — 왼쪽에 페이지 제목(h1), 오른쪽에 결과 수와 도구를 둔다.
 *
 * 사진 작업 목록과 개발 블로그 목록이 같은 배치를 쓰므로 마크업과 간격만 공유한다.
 * 필터·정렬 같은 목록 상태는 갖지 않으며, 도구는 `children` 으로 받는다. 상태를 가진
 * 도구(뷰 전환 등)가 클라이언트 컴포넌트라도 이 껍데기는 서버에서 렌더할 수 있다.
 *
 * 결과 수 문구도 포맷하지 않는다. 단위가 지면마다 다르고(`12 photos` · `9 articles`)
 * 두 언어에서 같은 표기를 쓰므로, 문자열은 호출부가 만들어 넘긴다.
 *
 * @param {Props} props
 * @param {string} props.title 페이지 제목. 지면의 유일한 h1 이다.
 * @param {string | undefined} props.count 완성된 결과 수 문구. 없으면 표시하지 않는다.
 * @param {ReactNode | undefined} props.children 제목 오른쪽 도구. `count` 와 함께 한 줄에 놓인다.
 * @returns {JSX.Element} count·children 이 모두 없으면 도구 영역을 그리지 않는다.
 */
const PageToolbar = ({ title, count, children }: Props) => (
  <div className={styles.toolbar}>
    <h1 className={styles.title}>{title}</h1>
    {count || children ? (
      <div className={styles.tools}>
        {count ? <span className={styles.count}>{count}</span> : null}
        {children}
      </div>
    ) : null}
  </div>
);

export { PageToolbar };
