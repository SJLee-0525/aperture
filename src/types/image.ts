/** Storage 이미지 메타 — path는 삭제 시 정리용, w/h는 next/image CLS 방지(저장 webp 기준) */
type ImageMeta = { url: string; path: string; w: number; h: number };

export type { ImageMeta };
