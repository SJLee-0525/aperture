import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import { SITE_IMAGE_SIZE } from "@/lib/seo/site-meta";

const fontsDirectory = path.join(process.cwd(), "src", "assets", "fonts");
const newsreaderFont = readFile(path.join(fontsDirectory, "Newsreader_60pt-Medium.ttf"));
const splineSansMonoFont = readFile(path.join(fontsDirectory, "SplineSansMono-Regular.ttf"));

type Options = {
  dark?: boolean;
  accent?: string;
};

const createSiteImage = async ({ dark = false, accent = "#d45d3f" }: Options = {}) => {
  const [newsreader, splineSansMono] = await Promise.all([newsreaderFont, splineSansMonoFont]);

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: dark ? "#151515" : "#f1efe9",
        color: dark ? "#f1efe9" : "#151515",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "28px", width: "100%" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Newsreader",
            fontSize: 88,
            fontWeight: 500,
            letterSpacing: "-4px",
          }}
        >
          Sungjoon Lee<span style={{ color: accent }}>.</span>
        </div>
        <div
          style={{
            fontFamily: "Spline Sans Mono",
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: "1px",
          }}
        >
          Developer, Photographer, Pianist
        </div>
      </div>
    </div>,
    {
      ...SITE_IMAGE_SIZE,
      fonts: [
        { name: "Newsreader", data: newsreader.buffer, weight: 500, style: "normal" },
        { name: "Spline Sans Mono", data: splineSansMono.buffer, weight: 400, style: "normal" },
      ],
    },
  );
};

export { createSiteImage };
