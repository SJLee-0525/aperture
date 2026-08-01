import { createSiteImage } from "@/lib/metadata/create-site-image";

export const dynamic = "force-static";

const GET = async () => createSiteImage({ accent: "#16a34a" });

export { GET };
