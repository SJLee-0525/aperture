import { createSiteImage } from "@/lib/metadata/create-site-image";

export const dynamic = "force-static";

const GET = async () => createSiteImage({ dark: true, accent: "#16a34a" });

export { GET };
