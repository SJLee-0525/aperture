import type { LocalizedArrayKey } from "@/features/admin-dev-projects/_hooks/use-project-editor";
import type { DevProjectInput } from "@/lib/firebase/dev";

import styles from "./ProjectForm.module.css";

/** 다국어 프로젝트 목록 필드에 전달하는 속성. */
type Props = {
  /** 편집할 프로젝트 배열 필드. */
  field: LocalizedArrayKey;
  /** 필드 위에 표시할 제목. */
  legend: string;
  /** 현재 필드에 저장된 한국어·영어 항목 목록. */
  items: DevProjectInput[LocalizedArrayKey];
  /** 지정한 필드에 빈 항목을 추가한다. */
  onAdd: (field: LocalizedArrayKey) => void;
  /** 지정한 항목의 언어별 문자열을 수정한다. */
  onEdit: (field: LocalizedArrayKey, index: number, lang: "ko" | "en", value: string) => void;
  /** 지정한 필드에서 항목 하나를 제거한다. */
  onRemove: (field: LocalizedArrayKey, index: number) => void;
};

/**
 * 프로젝트의 다국어 배열 필드를 항목 추가·수정·삭제 UI로 렌더링한다.
 *
 * @param {Props} props 목록 필드 렌더링에 필요한 속성.
 * @param {LocalizedArrayKey} props.field 편집할 프로젝트 배열 필드.
 * @param {string} props.legend 필드 위에 표시할 제목.
 * @param {DevProjectInput[LocalizedArrayKey]} props.items 현재 저장된 다국어 항목 목록.
 * @param {(field: LocalizedArrayKey) => void} props.onAdd 빈 항목을 추가하는 콜백.
 * @param {(field: LocalizedArrayKey, index: number, lang: "ko" | "en", value: string) => void} props.onEdit 언어별 항목 값을 수정하는 콜백.
 * @param {(field: LocalizedArrayKey, index: number) => void} props.onRemove 항목을 제거하는 콜백.
 * @returns {React.JSX.Element} 다국어 항목 편집 필드.
 */
const LocalizedProjectListField = ({ field, legend, items, onAdd, onEdit, onRemove }: Props) => (
  <section className={styles.section}>
    <div className={styles.arrayHead}>
      <h2 className={styles.legend}>{legend}</h2>
      <button type="button" className={styles.add} onClick={() => onAdd(field)}>
        + 항목 추가
      </button>
    </div>
    {items.length === 0 ? (
      <p className={styles.note}>아직 항목이 없습니다.</p>
    ) : (
      <ul className={styles.arrayList}>
        {items.map((item, index) => (
          <li key={index} className={styles.arrayRow}>
            <div className={styles.grid2}>
              <input
                className={styles.input}
                value={item.ko}
                placeholder="한국어"
                onChange={(event) => onEdit(field, index, "ko", event.target.value)}
              />
              <input
                className={styles.input}
                value={item.en}
                placeholder="English"
                onChange={(event) => onEdit(field, index, "en", event.target.value)}
              />
            </div>
            <button type="button" className={styles.remove} onClick={() => onRemove(field, index)}>
              삭제
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export { LocalizedProjectListField };
