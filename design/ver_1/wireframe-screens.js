/* wireframe-screens.js — screen builders for the photo-portfolio wireframes.
   Plain JS (globals). Used by Wireframes.html (design canvas) and _wftest. */

const ICON = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  mason:
    '<rect x="3" y="3" width="7" height="10"/><rect x="14" y="3" width="7" height="6"/><rect x="3" y="16" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/>',
  just: '<rect x="3" y="4" width="10" height="6"/><rect x="15" y="4" width="6" height="6"/><rect x="3" y="14" width="6" height="6"/><rect x="11" y="14" width="10" height="6"/>',
  heart: '<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z"/>',
  pin: '<path d="M12 21s-6-5.7-6-10a6 6 0 1 1 12 0c0 4.3-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/>',
  cam: '<rect x="3" y="6" width="18" height="14"/><circle cx="12" cy="13" r="4"/><path d="M8 6l1.5-2h5L16 6"/>',
  album: '<rect x="3" y="5" width="18" height="14"/><path d="M3 9h18"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  close: '<path d="M5 5l14 14M19 5L5 19"/>',
  chevL: '<path d="M15 18l-6-6 6-6"/>',
  chevR: '<path d="M9 18l6-6-6-6"/>',
  download: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  share:
    '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8 11l8-5M8 13l8 5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/>',
};
const ic = (n, s = 18) =>
  `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" style="vertical-align:middle">${ICON[n] || ""}</svg>`;

const POOL = [
  ["tone01.png", "새벽의 항구", "f/2.8 · 1/500 · ISO100", 0.8],
  ["tone02.png", "골목, 5시", "f/1.4 · 1/2000 · ISO64", 1.2],
  ["tone03.png", "안개 능선", "f/8 · 1/125 · ISO200", 0.74],
  ["tone04.png", "부두", "f/4 · 1/250 · ISO100", 1.05],
  ["tone05.png", "심야", "f/1.8 · 1/60 · ISO800", 0.82],
  ["tone06.png", "설원", "f/11 · 1/400 · ISO100", 1.3],
  ["tone07.png", "파도", "f/5.6 · 1/1000 · ISO200", 0.72],
  ["tone08.png", "다리", "f/2 · 1/320 · ISO160", 1.1],
  ["tone09.png", "노을", "f/8 · 1/200 · ISO100", 0.86],
  ["tone10.png", "빗속", "f/1.4 · 1/125 · ISO400", 1.0],
  ["tone11.png", "정적", "f/4 · 1/500 · ISO100", 0.78],
  ["tone12.png", "수평선", "f/16 · 1/250 · ISO64", 1.24],
];

function tile(p, ar) {
  const arStyle = ar ? `aspect-ratio:${ar};` : p[3] ? `aspect-ratio:${p[3]};` : "";
  return `<figure class="wf-tile" style="${arStyle}">
    <div class="wf-photo" style="background-image:url(images/${p[0]})"></div>
    <button class="like on-photo wf-like">${ic("heart", 17)}</button>
    <figcaption class="wf-ov"><div class="t">${p[1]}</div><div class="m">${p[2]}</div></figcaption>
  </figure>`;
}

function topnav(active) {
  const a = (n, id) => `<a href="#" class="${active === id ? "cur" : ""}">${n}</a>`;
  return `<div class="topnav">
    <span class="brand">Aperture<span class="dot">.</span></span>
    <nav>${a("작업", "work")}${a("앨범", "alb")}${a("지도", "map")}${a("소개", "about")}</nav>
    <span class="spacer"></span>
    <span class="searchbox">${ic("search", 15)} 검색</span>
    <span class="iconbtn">${ic("sun", 17)}</span>
    <span class="avatar"></span>
  </div>`;
}

function segmented(active) {
  const b = (n, id, icn) =>
    `<button ${active === id ? 'aria-pressed="true"' : ""}>${ic(icn, 15)} ${n}</button>`;
  return `<div class="segmented">${b("정사각", "sq", "grid")}${b("메이슨리", "ms", "mason")}${b("저스티파이", "js", "just")}</div>`;
}

function mapHTML(h = 150) {
  return `<div class="mapw" style="height:${h}px">
    <svg class="map" viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" style="height:${h}px;width:100%">
      <rect width="400" height="190" fill="var(--map-land)"/>
      <path d="M-10 120 Q 80 90 160 130 T 360 110 L 420 200 L -10 200 Z" fill="var(--map-water)"/>
      <g stroke="var(--map-road)" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"><path d="M-10 60 L 410 50"/><path d="M40 -10 L 70 200"/><path d="M210 -10 L 240 200"/><path d="M-10 140 L 410 150"/></g>
      <g stroke="var(--map-road)" stroke-width="2.5" fill="none" opacity="0.6"><path d="M-10 95 L 410 88"/><path d="M130 -10 L 150 200"/><path d="M300 -10 L 320 200"/></g>
    </svg>
    <div class="map-pin"><div class="pulse"></div><div class="pin-dot"></div></div>
    <div class="map-coords"><div class="map-place"><div class="nm">도쿄 미나토구</div><div class="co">35.6586° N, 139.7454° E</div></div></div>
  </div>`;
}

function exifSheet() {
  return `<div class="exif">
    <div class="exif-head"><div class="exif-cam"><span class="body">Sony α7 IV</span><span class="lens">FE 35mm F1.4 GM</span></div></div>
    <div class="triangle">
      <div class="tri"><span class="l">조리개</span><div class="v">f/1.8</div></div>
      <div class="tri"><span class="l">셔터</span><div class="v">1/250</div></div>
      <div class="tri"><span class="l">감도</span><div class="v">400</div></div>
    </div>
    <div class="exif-list">
      <div class="exif-row"><span class="k">초점거리</span><span class="val">35 mm</span></div>
      <div class="exif-row"><span class="k">노출보정</span><span class="val">−0.3 EV</span></div>
      <div class="exif-row"><span class="k">화이트밸런스</span><span class="val">5600 K</span></div>
      <div class="exif-row"><span class="k">측광</span><span class="val">Multi</span></div>
    </div>
  </div>`;
}

const chips = (arr) =>
  `<div class="chiprow">${arr.map((t, i) => `<span class="chip-tag ${i === 0 ? "active" : ""}">${t}</span>`).join("")}</div>`;

function homeA() {
  return `<div class="wf-screen">
    ${topnav("work")}
    <div class="wf-toolbar"><div class="wf-h">작업 <span class="sub">Work</span></div>
      <div class="wf-tools">${segmented("ms")}<span class="wf-count">128 photos</span></div></div>
    <div class="wf-mason">${POOL.concat(POOL.slice(0, 4))
      .map((p) => tile(p))
      .join("")}</div>
  </div>`;
}

function homeB() {
  const rl = (n, id, icn) =>
    `<a href="#" class="${id === "work" ? "cur" : ""}">${ic(icn, 18)} ${n}</a>`;
  return `<div class="wf-screen wf-row">
    <aside class="wf-rail">
      <span class="brand">Aperture<span class="dot">.</span></span>
      <div class="wf-railnav">${rl("작업", "work", "grid")}${rl("앨범", "alb", "album")}${rl("지도", "map", "map")}${rl("소개", "about", "user")}</div>
      <div class="wf-rail-foot"><span class="avatar" style="width:28px;height:28px"></span><div><div class="nm">현우</div><div class="rl">관리자</div></div></div>
    </aside>
    <div class="wf-main">
      <div class="wf-toolbar"><div class="wf-h">작업 <span class="sub">Work</span></div>
        <div class="wf-tools">${segmented("sq")}<span class="wf-count">128 photos</span></div></div>
      <div class="wf-sq">${POOL.concat(POOL.slice(0, 4))
        .map((p) => tile(p, "1"))
        .join("")}</div>
    </div>
  </div>`;
}

function homeC() {
  return `<div class="wf-screen">
    <div class="topnav" style="justify-content:center;gap:32px">
      <span class="brand">Aperture<span class="dot">.</span></span>
      <nav><a href="#" class="cur">작업</a><a href="#">앨범</a><a href="#">지도</a><a href="#">소개</a></nav>
    </div>
    <header class="wf-masthead">
      <div class="nm">Hyunwoo Yang<br><em>— photography</em></div>
      <p class="bio">빛과 정적의 도시 풍경. 서울·도쿄·제주에서 찍은 장노출과 거리 사진을 모았습니다. 모든 컷에는 촬영 데이터가 함께 기록됩니다.</p>
      <div class="wf-filters">${["전체", "야경", "시스케이프", "스트리트", "필름", "흑백"].map((t, i) => `<span class="chip-tag ${i === 0 ? "active" : ""}">${t}</span>`).join("")}</div>
    </header>
    <div class="wf-just">${POOL.map((p) => tile(p, (p[3] * 1.6).toFixed(2))).join("")}</div>
  </div>`;
}

function detailA() {
  const mr = (k, v) =>
    `<div class="wf-mr" style="border-color:rgba(255,255,255,.08)"><span class="k" style="color:#8a8a93">${k}</span><span class="v" style="color:#fafafa">${v}</span></div>`;
  return `<div class="wf-screen" style="background:#0a0a0c">
    <div style="display:grid;grid-template-columns:1fr 360px;height:100%">
      <div style="position:relative;overflow:hidden">
        <div class="wf-photo" style="position:absolute;inset:0;background-image:url(images/wide3.png)"></div>
        <span class="iconbtn glass" style="position:absolute;top:20px;right:20px;z-index:2">${ic("close", 17)}</span>
        <span class="iconbtn glass" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);z-index:2">${ic("chevL", 17)}</span>
        <span class="iconbtn glass" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);z-index:2">${ic("chevR", 17)}</span>
        <div class="exif-strip glass" style="position:absolute;left:50%;bottom:24px;transform:translateX(-50%);z-index:2"><span class="seg"><span class="lab">F</span> f/1.8</span><span class="seg"><span class="lab">S</span> 1/250</span><span class="seg"><span class="lab">ISO</span> 400</span></div>
      </div>
      <aside style="background:#141416;border-left:1px solid rgba(255,255,255,.08);padding:24px;color:#fafafa;display:flex;flex-direction:column;gap:18px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="flex:1;min-width:0"><div style="font-family:var(--font-display);font-size:1.4rem;white-space:nowrap">새벽의 항구</div><div style="font-size:11px;color:#8a8a93;margin-top:4px;font-variant-numeric:tabular-nums">2026·05·02 · 18:41</div></div>
          <button class="like on-photo" aria-pressed="true" style="background:rgba(255,255,255,.08)">${ic("heart", 18)}</button>
        </div>
        <div class="wf-meta-rows">${mr("카메라", "α7 IV")}${mr("렌즈", "35mm GM")}${mr("초점거리", "35 mm")}${mr("화이트밸런스", "5600 K")}</div>
        ${mapHTML(140)}
        <div class="chiprow"><span class="chip-tag" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:#c7c7cd">야경</span><span class="chip-tag" style="background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1);color:#c7c7cd">도쿄</span></div>
        <div class="wf-foot"><button class="btn btn-primary" style="flex:1;justify-content:center">${ic("download", 16)} 내보내기</button><span class="iconbtn glass">${ic("share", 17)}</span></div>
      </aside>
    </div>
  </div>`;
}

function detailB() {
  return `<div class="wf-screen">
    ${topnav("work")}
    <div class="wf-bread">
      <div class="crumb">작업 ${ic("chevR", 14)} <b>새벽의 항구</b></div>
      <span class="spacer" style="flex:1"></span>
      <span class="iconbtn">${ic("chevL", 17)}</span><span class="iconbtn">${ic("chevR", 17)}</span>
    </div>
    <div class="wf-detail">
      <div class="wf-pane"><div class="wf-photo" style="background-image:url(images/wide1.png)"></div></div>
      <aside class="wf-aside">
        <div><div class="ttl">새벽의 항구</div><div class="date">2026·05·02 · 18:41 · 도쿄 미나토</div></div>
        ${exifSheet()}
        ${mapHTML(140)}
        ${chips(["야경", "도쿄", "α7 IV", "FE 35mm"])}
        <div><div class="u-label" style="margin-bottom:8px">내보내기 스타일</div><div class="wf-exprow"><span class="wf-expchip on">미니멀 바</span><span class="wf-expchip">폴라로이드</span><span class="wf-expchip">필름</span><span class="wf-expchip">갤러리 매트</span></div></div>
        <div class="wf-foot"><button class="btn btn-primary" style="flex:1;justify-content:center">${ic("download", 16)} 내보내기</button><button class="btn btn-secondary">${ic("edit", 16)} 편집</button></div>
      </aside>
    </div>
  </div>`;
}
