const fontFile = "https://mock.local/font.woff2";

const fontFace = (family) => `
  @font-face {
    font-family: '${family}';
    font-style: normal;
    font-weight: 100 900;
    font-display: swap;
    src: url(${fontFile}) format('woff2');
  }
`;

module.exports = {
  "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap":
    fontFace("Newsreader"),
  "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500&display=swap":
    fontFace("Noto Serif KR"),
  "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400..900&display=swap":
    fontFace("Schibsted Grotesk"),
  "https://fonts.googleapis.com/css2?family=Spline+Sans+Mono:wght@300..700&display=swap":
    fontFace("Spline Sans Mono"),
};
