import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

export const alt = "Sungjoon Lee — Photographer, Pianist, Developer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontsDirectory = path.join(process.cwd(), "src", "assets", "fonts");
const newsreaderFont = readFile(path.join(fontsDirectory, "Newsreader_60pt-Medium.ttf"));
const splineSansMonoFont = readFile(path.join(fontsDirectory, "SplineSansMono-Regular.ttf"));

export default async function OpenGraphImage() {
  const [newsreader, splineSansMono] = await Promise.all([newsreaderFont, splineSansMonoFont]);

  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#f1efe9",
        color: "#151515",
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
          Sungjoon Lee<span style={{ color: "#d45d3f" }}>.</span>
        </div>
        <div
          style={{
            fontFamily: "Spline Sans Mono",
            fontSize: 34,
            fontWeight: 400,
            letterSpacing: "1px",
          }}
        >
          Photographer · Pianist · Developer
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Newsreader",
          data: newsreader.buffer,
          weight: 500,
          style: "normal",
        },
        {
          name: "Spline Sans Mono",
          data: splineSansMono.buffer,
          weight: 400,
          style: "normal",
        },
      ],
    },
  );
}
