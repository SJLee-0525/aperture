/* mobile-screens.js — mobile screen builders for the photo portfolio canvas.
   Reuses PHOTOS / ALBUMS / framePreview / bigMap from portfolio.js. */

const MI = {
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  back:'<path d="M15 18l-6-6 6-6"/>', chevR:'<path d="M9 18l6-6-6-6"/>',
  close:'<path d="M5 5l14 14M19 5L5 19"/>',
  heart:'<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8 11l8-5M8 13l8 5"/>',
  download:'<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  funnel:'<path d="M3 5h18M6 12h12M10 19h4"/>',
  work:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  album:'<rect x="3" y="5" width="18" height="14"/><path d="M3 9h18"/>',
  map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  pin:'<path d="M12 21s-6-5.7-6-10a6 6 0 1 1 12 0c0 4.3-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/>',
};
const mi = (n, s=20)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7">${MI[n]||''}</svg>`;

function statusBar(onPhoto){
  const ic = `<span class="si"><svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="6" width="3" height="5" rx="1"/><rect x="4" y="4" width="3" height="7" rx="1"/><rect x="8" y="2" width="3" height="9" rx="1"/><rect x="12" y="0" width="3" height="11" rx="1"/></svg>`+
    `<svg width="16" height="11" viewBox="0 0 16 11" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 4a10 10 0 0 1 14 0M3.5 6.5a6 6 0 0 1 9 0M6 9a2.5 2.5 0 0 1 4 0"/></svg>`+
    `<svg width="24" height="12" viewBox="0 0 24 12" fill="currentColor"><rect x="0.5" y="1" width="19" height="10" rx="2.5" fill="none" stroke="currentColor" opacity="0.5"/><rect x="2" y="2.5" width="14" height="7" rx="1"/><rect x="21" y="4" width="2" height="4" rx="1"/></svg></span>`;
  return `<div class="m-status${onPhoto?' on-photo':''}"><span>9:41</span>${ic}</div>`;
}

function tabbar(active){
  const t=(n,id,icn)=>`<div class="m-tab ${id===active?'on':''}" data-tab="${id}">${mi(icn,22)}<span>${n}</span></div>`;
  return `<div class="m-tabbar">${t('작업','work','work')}${t('앨범','albums','album')}${t('지도','map','map')}${t('소개','about','user')}</div>`;
}

function mTile(i){
  const p=PHOTOS[i];
  return `<figure class="m-tile" data-i="${i}"><div class="ph" style="aspect-ratio:${p.ar};background-image:url(images/${p.img})"></div>
    <div class="ov"><div class="t">${p.title}</div><div class="m">${p.f} · ${p.s} · ISO${p.iso}</div></div></figure>`;
}

const TAGS6 = ['전체','야경','시스케이프','스트리트','풍경','바다'];

function mHome(){
  return `<div class="m-screen">${statusBar()}
    <div class="m-top"><span class="m-brand">Aperture<span class="dot">.</span></span><span class="sp"></span>
      <span class="m-iconbtn" data-act="theme">${mi('sun',20)}</span><span class="m-avatar"></span></div>
    <div class="m-searchrow"><div class="m-search">${mi('search',15)} 검색 · 태그 / 장비 / 장소</div><button class="m-filtbtn">${mi('funnel',19)}</button></div>
    <div class="m-chips">${TAGS6.map((t,i)=>`<span class="chip-tag ${i===0?'active':''}">${t}</span>`).join('')}</div>
    <div class="m-body"><div class="m-grid">${[0,2,4,1,6,3,8,5,10,7].map(i=>mTile(i)).join('')}</div></div>
    ${tabbar('work')}</div>`;
}

function mDetailPeek(i=0){
  const p=PHOTOS[i];
  return `<div class="m-screen"><div class="m-detail">
    <div class="big" style="background-image:url(images/${p.img})"></div>
    ${statusBar(true)}
    <div class="dtop"><span class="m-gbtn m-back">${mi('back',19)}</span><span class="sp"></span><span class="m-gbtn">${mi('share',18)}</span><span class="m-gbtn">${mi('heart',18)}</span></div>
    <div class="m-sheet"><div class="handle"></div>
      <div class="sh-head"><div><div class="sh-ti">${p.title}</div><div class="sh-date">${p.date} · ${p.place}</div></div></div>
      <div class="exif-strip glass" style="margin-top:14px"><span class="seg"><span class="lab">F</span> ${p.f}</span><span class="seg"><span class="lab">S</span> ${p.s}</span><span class="seg"><span class="lab">ISO</span> ${p.iso}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-top:12px;font-size:11px;color:var(--text-3)"><span>${p.cam}</span><span style="font-variant-numeric:tabular-nums">${p.lens.replace(/^(FE |XF |Z |Summilux )/,'')} · ${p.fl}</span></div>
      <div class="hint">↑ 위로 끌어 전체 EXIF · 지도 보기</div>
    </div></div></div>`;
}

function mDetailSheet(i=0){
  const p=PHOTOS[i];
  return `<div class="m-screen"><div class="m-detail">
    <div class="big" style="background-image:url(images/${p.img})"></div>
    ${statusBar(true)}
    <div class="dtop"><span class="m-gbtn m-back">${mi('back',19)}</span></div>
    <div class="m-scrim"></div>
    <div class="m-sheet" style="max-height:80%;overflow-y:auto">
      <div class="handle"></div>
      <div class="sh-head"><div><div class="sh-ti">${p.title}</div><div class="sh-date">${p.date}</div></div><span class="m-iconbtn" style="color:var(--like)">${mi('heart',20)}</span></div>
      <div class="exif" style="margin-top:16px">
        <div class="exif-head"><div class="exif-cam"><span class="body">${p.cam}</span><span class="lens">${p.lens}</span></div></div>
        <div class="triangle"><div class="tri"><span class="l">조리개</span><div class="v">${p.f}</div></div><div class="tri"><span class="l">셔터</span><div class="v">${p.s}</div></div><div class="tri"><span class="l">감도</span><div class="v">${p.iso}</div></div></div>
        <div class="exif-list"><div class="exif-row"><span class="k">초점거리</span><span class="val">${p.fl}</span></div><div class="exif-row"><span class="k">화이트밸런스</span><span class="val">${p.wb}</span></div><div class="exif-row"><span class="k">측광</span><span class="val">${p.meter}</span></div></div>
      </div>
      <div class="m-sheet" style="position:static;box-shadow:none;border:0;padding:0;margin-top:16px">
        <div class="mapw" style="height:120px"><div class="map-coords"><div class="map-place"><div class="nm">${p.place}</div><div class="co">${p.coords}</div></div></div></div>
      </div>
      <button class="btn btn-primary m-export" style="width:100%;justify-content:center;margin:18px 0 4px">${mi('download',16)} 내보내기</button>
    </div></div></div>`;
}

function mAlbums(){
  const card=(a,i)=>`<figure class="m-alb" data-album="${i}"><div class="cov"><div class="ph" style="background-image:url(images/${a.cover})"></div><span class="cnt">${a.photos.length}</span></div><div class="ti">${a.title}</div><div class="me">${a.sub}</div></figure>`;
  return `<div class="m-screen">${statusBar()}
    <div class="m-top"><span class="m-brand">Aperture<span class="dot">.</span></span><span class="sp"></span><span class="m-iconbtn">${mi('search',20)}</span><span class="m-avatar"></span></div>
    <div class="m-body" style="padding-top:6px"><div class="m-albgrid">${ALBUMS.map((a,i)=>card(a,i)).join('')}</div></div>
    ${tabbar('albums')}</div>`;
}

function mAlbumDetail(i=0){
  const a=ALBUMS[i];
  return `<div class="m-screen">${statusBar(true)}
    <div class="m-hero" style="background-image:url(images/${a.cover})"><div class="scrim"></div>
      <span class="m-gbtn m-back">${mi('back',19)}</span>
      <div class="txt"><div class="ti">${a.title}</div><div class="me">${a.sub} · ${a.photos.length} photos</div></div></div>
    <div class="m-body"><div class="m-grid" style="padding-top:12px">${a.photos.concat(a.photos.slice(0,2)).map(i=>mTile(i)).join('')}</div></div>
    ${tabbar('albums')}</div>`;
}

function mMap(){
  const pos=[[24,30],[58,22],[40,52],[72,44],[30,68],[64,72]];
  const pins=pos.map((q,i)=>`<div class="pin" style="left:${q[0]}%;top:${q[1]}%"><div class="dot"></div></div>`).join('');
  const locs=[0,3,6,8,11].map(i=>{const p=PHOTOS[i];return `<div class="m-loc"><div class="th" style="background-image:url(images/${p.img})"></div><div class="pl">${p.place}</div><div class="co">${p.coords}</div></div>`;}).join('');
  return `<div class="m-screen">${statusBar()}
    <div class="m-body" style="position:relative">
      <div class="m-map"><div class="stage">${bigMap()}</div>${pins}</div>
      <div class="m-mapsheet"><div class="handle"></div><div class="lbl"><span class="u-label">촬영 위치</span></div><div class="m-locrow">${locs}</div></div>
    </div>
    ${tabbar('map')}</div>`;
}

function mAbout(){
  const cams=[...new Set(PHOTOS.map(p=>p.cam))], places=[...new Set(PHOTOS.map(p=>p.place.split(' ')[0]))];
  const st=(n,l)=>`<div class="stat"><div class="sn">${n}</div><div class="sl">${l}</div></div>`;
  return `<div class="m-screen">${statusBar()}
    <div class="m-top"><span class="m-brand">Aperture<span class="dot">.</span></span><span class="sp"></span><span class="m-avatar"></span></div>
    <div class="m-body"><div class="m-about">
      <div class="nm">Hyunwoo<br>Yang <em>—<br>photography</em></div>
      <p class="bio">빛과 정적의 도시 풍경. 서울·도쿄·제주에서 장노출과 거리 사진을 찍습니다.</p>
      <div class="ct"><a href="#">Instagram ↗</a><a href="#">Email ↗</a></div>
      <div class="stats">${st(PHOTOS.length,'PHOTOS')}${st(ALBUMS.length,'ALBUMS')}${st(places.length,'LOCATIONS')}${st(cams.length,'BODIES')}</div>
      <div class="gear"><span class="u-label">장비</span><ul>${cams.map(c=>`<li>${c}</li>`).join('')}</ul></div>
    </div></div>
    ${tabbar('about')}</div>`;
}

function mFilterSheet(){
  const cams=['전체',...new Set(PHOTOS.map(p=>p.cam))];
  return `<div class="m-screen">${statusBar()}
    <div class="m-top"><span class="m-brand">Aperture<span class="dot">.</span></span><span class="sp"></span><span class="m-iconbtn" style="color:var(--accent)">${mi('funnel',20)}</span><span class="m-avatar"></span></div>
    <div class="m-body"><div class="m-grid" style="opacity:0.4">${[0,2,4,1].map(i=>mTile(i)).join('')}</div></div>
    <div class="m-scrim"></div>
    <div class="m-sheet m-fsheet" style="z-index:6">
      <div class="handle"></div>
      <div class="sh-head"><div class="sh-ti">필터</div><span class="m-iconbtn m-close">${mi('close',20)}</span></div>
      <div class="frow"><span class="u-label">카메라</span><select><option>${cams[0]}</option></select></div>
      <div class="frow"><div class="frh"><span class="u-label">초점거리</span><span style="font-family:var(--font-sans);font-variant-numeric:tabular-nums;font-size:13px;color:var(--text-2)">16mm – 300mm</span></div>
        <div class="range"><div class="trk"></div><div class="fill" style="left:0;right:0"></div><div class="h" style="left:0"></div><div class="h" style="left:100%"></div></div></div>
      <div class="frow"><span class="u-label">태그</span><div class="chiprow" style="margin-top:8px">${['야경','시스케이프','스트리트','풍경'].map((t,i)=>`<span class="chip-tag ${i===0?'active':''}">${t}</span>`).join('')}</div></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:20px">적용 · 128 photos</button>
    </div>
    ${tabbar('work')}</div>`;
}

function mExportSheet(i=0){
  const p=PHOTOS[i];
  const styles=[['bar','미니멀 바'],['pola','폴라로이드'],['film','필름'],['mat','갤러리 매트']];
  const items=styles.map(([s,nm],i)=>`<div class="m-expitem ${i===0?'on':''}"><div class="fr-wrap">${framePreview(s,p,{wm:false,range:'expo',res:'orig'})}</div><div class="nm">${nm}</div></div>`).join('');
  return `<div class="m-screen"><div class="m-detail"><div class="big" style="background-image:url(images/${p.img})"></div>${statusBar(true)}<div class="m-scrim"></div></div>
    <div class="m-sheet" style="z-index:6;max-height:82%">
      <div class="handle"></div>
      <div class="sh-head"><div class="sh-ti">내보내기</div><span class="m-iconbtn m-close">${mi('close',20)}</span></div>
      <div class="m-exprow">${items}</div>
      <div class="sh-section"><span class="u-label">워터마크</span><div class="m-opt-seg"><button class="on">없음</button><button>Aperture.</button></div></div>
      <div class="sh-section"><span class="u-label">메타 범위</span><div class="m-opt-seg"><button class="on">노출만</button><button>전체</button><button>위치</button></div></div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:18px">${mi('download',16)} PNG로 내보내기</button>
    </div></div>`;
}
