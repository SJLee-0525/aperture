import type { LocalizedArrayKey } from "@/features/admin-dev-projects/_hooks/use-project-editor";
import type { DevProjectInput } from "@/lib/firebase/dev";

import styles from "./ProjectForm.module.css";

type Props = {
  field: LocalizedArrayKey;
  legend: string;
  items: DevProjectInput[LocalizedArrayKey];
  onAdd: (field: LocalizedArrayKey) => void;
  onEdit: (field: LocalizedArrayKey, index: number, lang: "ko" | "en", value: string) => void;
  onRemove: (field: LocalizedArrayKey, index: number) => void;
};

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
