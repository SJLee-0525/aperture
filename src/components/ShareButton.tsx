"use client";

type Props = {
  title: string;
  label: string;
  className?: string;
};

const shareIcon = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
  </svg>
);

/** 현재 딥링크를 네이티브 공유 시트로 전달하는 공용 아이콘 버튼. */
const ShareButton = ({ title, label, className }: Props) => {
  const share = async () => {
    const url = window.location.href;
    if (typeof navigator.share !== "function") {
      await navigator.clipboard?.writeText(url);
      return;
    }

    try {
      await navigator.share({ title, url });
    } catch (error) {
      // 공유 시트를 닫는 것은 정상적인 사용자 취소 흐름이다.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("Failed to share", error);
      }
    }
  };

  return (
    <button type="button" className={className} aria-label={label} onClick={share}>
      {shareIcon}
    </button>
  );
};

export { ShareButton };
