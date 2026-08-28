import { createSiteImage } from "@/lib/metadata/create-site-image";

export const dynamic = "force-static";

/** globals.css 의 --accent-dev 라이트 값. ImageResponse 는 CSS 변수를 읽지 못한다. */
const DEV_ACCENT = "#087a32";

const GET = async () => createSiteImage({ dark: true, accent: DEV_ACCENT });

export { GET };
