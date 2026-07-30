import { NextResponse } from "next/server";

import { adjacentPhotos, serializePhoto } from "@/features/photo-detail/_lib/photo-detail-payload";
import { getPhotos } from "@/lib/content/get-photos";
import { getTags } from "@/lib/content/get-tags";

export const revalidate = 3600;

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const [photos, tags] = await Promise.all([getPhotos(), getTags()]);
  const selected = adjacentPhotos(photos, id);

  if (selected.length === 0) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      photos: selected.map(serializePhoto),
      tags,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
