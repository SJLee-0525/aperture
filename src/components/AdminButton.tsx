import Link from "next/link";

import type { ComponentProps, MouseEvent } from "react";

import styles from "./AdminButton.module.css";

type AdminButtonVariant = "primary" | "secondary" | "danger";
type AdminButtonSize = "md" | "sm" | "xs";

type AdminButtonOwnProps = {
  /** danger 는 되돌릴 수 없는 동작에 쓴다. 강조(primary)는 안전한 쪽이 가져간다. */
  variant: AdminButtonVariant;
  /** md 44px · sm 40px · xs 36px. 기본 md. */
  size?: AdminButtonSize;
};

type AdminButtonLinkProps = AdminButtonOwnProps &
  Omit<ComponentProps<typeof Link>, "aria-disabled"> & {
    href: ComponentProps<typeof Link>["href"];
    /** 링크에는 네이티브 disabled 가 없다. 클릭·키보드 이동을 코드로 막는다. */
    disabled?: boolean;
  };

type AdminButtonProps =
  (AdminButtonOwnProps & { href?: undefined } & ComponentProps<"button">) | AdminButtonLinkProps;

const sizeClass: Record<AdminButtonSize, string> = {
  md: styles.md,
  sm: styles.sm,
  xs: styles.xs,
};

/**
 * 관리자 화면 공용 버튼. `href`가 있으면 같은 외형의 Link로 렌더링한다.
 * 기본 `type`은 "button"이므로 제출 버튼은 `type="submit"`을 명시해야 한다.
 * 배치(width·flex·grid)는 호출부 className이 담당한다.
 *
 * 링크 변형의 `disabled`는 저장이 끝나기 전에 화면을 떠나는 것을 막는 용도다. 실제 차단은
 * onClick 에서 하고 CSS 는 시각 표현만 맡는다. `data-admin-control`은 셸의 focus 규칙이
 * 이 버튼을 덮지 않게 하는 표시다.
 */
const AdminButton = (props: AdminButtonProps) => {
  const { variant, size = "md", className, ...rest } = props;
  const buttonClassName = [styles.button, styles[variant], sizeClass[size], className]
    .filter(Boolean)
    .join(" ");

  if (props.href !== undefined) {
    const { disabled, onClick, ...linkRest } = rest as Omit<
      AdminButtonLinkProps,
      "variant" | "size" | "className"
    >;
    return (
      <Link
        {...linkRest}
        data-admin-control=""
        className={buttonClassName}
        aria-disabled={disabled ? "true" : undefined}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
      />
    );
  }

  const { type = "button", ...buttonRest } = rest as ComponentProps<"button">;
  return <button {...buttonRest} type={type} data-admin-control="" className={buttonClassName} />;
};

export { AdminButton };
