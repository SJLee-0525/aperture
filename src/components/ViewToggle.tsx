"use client";

import { Icon, type IconName } from "@/components/Icon";

import styles from "./ViewToggle.module.css";

type ViewToggleOption<Id extends string> = {
  id: Id;
  label: string;
  /** `Icon` 이 아는 이름만 받는다. `string` 이면 오타가 빈 `<svg>` 로 조용히 렌더된다. */
  icon: IconName;
};

type Props<Id extends string> = {
  options: readonly ViewToggleOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
};

/**
 * 목록 보기 방식 세그먼트 컨트롤 — 사진은 메이슨리/정사각, 블로그는 그리드/목록을 고른다.
 *
 * 아이콘만 보이므로 선택지 이름은 `label`(accessible name)이 전부다. 각 선택지는 독립된
 * button 이고 현재 값만 `aria-pressed="true"` 를 갖는다. 스타일이 그 속성 선택자에 걸려
 * 있으므로 상태 표현 방식을 바꾸면 CSS 도 함께 바꿔야 한다. radiogroup 대신 button 을
 * 쓰는 이유는 화살표 키 없이 Tab·Enter 만으로 조작하는 기존 동작을 유지하기 위해서다.
 *
 * 선택값은 갖지 않는다. 로컬 상태로 둘지 URL 에 남길지는 지면마다 다르다.
 *
 * @param props.options 표시 순서대로의 선택지. 각 항목은 id·label·Icon 이름을 갖는다.
 * @param props.value 현재 선택된 id. 목록에 없으면 아무것도 눌린 상태가 되지 않는다.
 * @param props.onChange 선택지를 누를 때 호출한다. 같은 값을 다시 눌러도 호출된다.
 */
const ViewToggle = <Id extends string>({ options, value, onChange }: Props<Id>) => (
  <div className={styles.seg}>
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        aria-pressed={option.id === value}
        aria-label={option.label}
        onClick={() => onChange(option.id)}
      >
        <Icon name={option.icon} size={15} />
      </button>
    ))}
  </div>
);

export { ViewToggle };
