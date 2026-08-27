import { AdminField } from "@/components/AdminField";
import { AdminInput } from "@/components/AdminInput";

import type { Lang } from "@/types/lang";
import type { LocalizedText } from "@/types/localized";
import type { ComponentProps } from "react";

type AdminInputSize = ComponentProps<typeof AdminInput>["size"];

type Props = {
  /** 라벨 어간. 두 입력이 `{label} (한국어)` · `{label} (English)` 로 렌더된다. */
  label: string;
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  /** 한국어 쪽에만 붙는다. 저장 조건이 ko 기준이기 때문이다. */
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  size?: AdminInputSize;
  disabled?: boolean;
  placeholder?: LocalizedText;
  /** 검증 결과의 field 이름 어간. 한국어 쪽이 `{field}.ko` 를 받는다. */
  field?: string;
  /** 한국어 쪽에 붙는 검증 문구. 저장 조건이 ko 기준이라 en 은 오류를 갖지 않는다. */
  error?: string;
};

import styles from "./LocalizedFieldPair.module.css";

/**
 * ko/en 한 쌍을 2열로 묶는 관리자 폼 필드.
 *
 * 이중언어는 이 저장소의 콘텐츠 계약이라 라벨 형식과 required 위치가 어긋나면
 * 화면마다 다른 규칙이 생긴다. 그 규칙을 한곳에 둔다.
 */
const LocalizedFieldPair = ({
  label,
  value,
  onChange,
  required,
  multiline = false,
  rows,
  size,
  disabled,
  placeholder,
  field,
  error,
}: Props) => {
  const side = (lang: Lang) => {
    const shared = {
      size,
      disabled,
      placeholder: placeholder?.[lang],
      value: value[lang],
      required: lang === "ko" ? required : undefined,
    };
    const onInput = (next: string) => onChange({ ...value, [lang]: next });

    return multiline ? (
      <AdminInput
        multiline
        rows={rows}
        {...shared}
        onChange={(event) => onInput(event.target.value)}
      />
    ) : (
      <AdminInput {...shared} onChange={(event) => onInput(event.target.value)} />
    );
  };

  return (
    <div className={styles.pair}>
      <AdminField
        label={`${label} (한국어)`}
        required={required}
        field={field ? `${field}.ko` : undefined}
        error={error}
      >
        {side("ko")}
      </AdminField>
      <AdminField label={`${label} (English)`}>{side("en")}</AdminField>
    </div>
  );
};

export { LocalizedFieldPair };
