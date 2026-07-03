/* portfolio.js — interactive prototype data + render + modal lightbox.
   Home A (top-nav masonry) → click photo → modal lightbox (photo dark, panel light/B-style). */

const P_ICON = {
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>',
  grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  mason:'<rect x="3" y="3" width="7" height="10"/><rect x="14" y="3" width="7" height="6"/><rect x="3" y="16" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/>',
  just:'<rect x="3" y="4" width="10" height="6"/><rect x="15" y="4" width="6" height="6"/><rect x="3" y="14" width="6" height="6"/><rect x="11" y="14" width="10" height="6"/>',
  heart:'<path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11Z"/>',
  close:'<path d="M5 5l14 14M19 5L5 19"/>',
  chevL:'<path d="M15 18l-6-6 6-6"/>', chevR:'<path d="M9 18l6-6-6-6"/>',
  download:'<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  share:'<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8 11l8-5M8 13l8 5"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="M14 6l4 4"/>',
};
const pic = (n, s=18)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.7" style="vertical-align:middle">${P_ICON[n]||''}</svg>`;

const PHOTOS = [
  {img:'tone01.png',ar:0.80,title:'새벽의 항구',date:'2026·05·02 · 18:41',cam:'Sony α7 IV',lens:'FE 35mm F1.4 GM',f:'f/2.8',s:'1/500',iso:'100',fl:'24 mm',ev:'−0.3 EV',wb:'5600 K',meter:'Multi',place:'도쿄 미나토구',coords:'35.6586° N, 139.7454° E',tags:['야경','도쿄','시스케이프'],likes:248},
  {img:'tone02.png',ar:1.20,title:'골목, 5시',date:'2026·04·18 · 05:12',cam:'Leica Q3',lens:'Summilux 28mm',f:'f/1.4',s:'1/2000',iso:'64',fl:'28 mm',ev:'0 EV',wb:'Auto',meter:'Center',place:'서울 을지로',coords:'37.5662° N, 126.9910° E',tags:['스트리트','서울','필름'],likes:182},
  {img:'tone03.png',ar:0.74,title:'안개 능선',date:'2026·03·09 · 06:30',cam:'Sony α7 IV',lens:'FE 70-200mm GM',f:'f/8',s:'1/125',iso:'200',fl:'135 mm',ev:'+0.3 EV',wb:'Cloudy',meter:'Multi',place:'강원 평창',coords:'37.5707° N, 128.3900° E',tags:['풍경','안개','흑백'],likes:301},
  {img:'tone04.png',ar:1.05,title:'부두',date:'2026·02·22 · 17:05',cam:'Fujifilm X-T5',lens:'XF 23mm F1.4',f:'f/4',s:'1/250',iso:'100',fl:'35 mm',ev:'0 EV',wb:'5200 K',meter:'Multi',place:'부산 영도',coords:'35.0917° N, 129.0680° E',tags:['바다','부산'],likes:97},
  {img:'tone05.png',ar:0.82,title:'심야',date:'2026·01·30 · 23:48',cam:'Sony α7 IV',lens:'FE 35mm F1.4 GM',f:'f/1.8',s:'1/60',iso:'800',fl:'35 mm',ev:'−0.7 EV',wb:'3200 K',meter:'Spot',place:'도쿄 신주쿠',coords:'35.6938° N, 139.7036° E',tags:['야경','도쿄'],likes:415},
  {img:'tone06.png',ar:1.30,title:'설원',date:'2026·01·12 · 09:20',cam:'Nikon Z8',lens:'Z 24-70mm f/2.8',f:'f/11',s:'1/400',iso:'100',fl:'50 mm',ev:'+1.0 EV',wb:'Daylight',meter:'Multi',place:'홋카이도 비에이',coords:'43.5882° N, 142.4669° E',tags:['풍경','설경','미니멀'],likes:268},
  {img:'tone07.png',ar:0.72,title:'파도',date:'2025·12·28 · 15:42',cam:'Sony α7 IV',lens:'FE 100-400mm GM',f:'f/5.6',s:'1/1000',iso:'200',fl:'300 mm',ev:'−0.3 EV',wb:'5600 K',meter:'Multi',place:'제주 서귀포',coords:'33.2541° N, 126.5600° E',tags:['바다','제주','장노출'],likes:153},
  {img:'tone08.png',ar:1.10,title:'다리',date:'2025·12·05 · 19:10',cam:'Leica Q3',lens:'Summilux 28mm',f:'f/2',s:'1/320',iso:'160',fl:'28 mm',ev:'0 EV',wb:'Auto',meter:'Center',place:'서울 한강',coords:'37.5172° N, 126.9963° E',tags:['야경','서울'],likes:204},
  {img:'tone09.png',ar:0.86,title:'노을',date:'2025·11·19 · 17:33',cam:'Fujifilm X-T5',lens:'XF 56mm F1.2',f:'f/8',s:'1/16000',iso:'12800',fl:'85 mm',ev:'−0.3 EV',wb:'5800 K',meter:'Multi',place:'인천 영종도',coords:'37.4910° N, 126.5000° E',tags:['노을','바다'],likes:176},
  {img:'tone10.png',ar:1.00,title:'빗속',date:'2025·11·02 · 20:55',cam:'Sony α7 IV',lens:'FE 35mm F1.4 GM',f:'f/1.4',s:'1/125',iso:'400',fl:'35 mm',ev:'−1.0 EV',wb:'3800 K',meter:'Spot',place:'오사카 난바',coords:'34.6659° N, 135.5010° E',tags:['스트리트','비','야경'],likes:329},
  {img:'tone11.png',ar:0.78,title:'정적',date:'2025·10·14 · 07:02',cam:'Nikon Z8',lens:'Z 50mm f/1.8',f:'f/4',s:'1/500',iso:'100',fl:'50 mm',ev:'0 EV',wb:'Cloudy',meter:'Multi',place:'경주 보문',coords:'35.8400° N, 129.2890° E',tags:['풍경','미니멀','흑백'],likes:142},
  {img:'tone12.png',ar:1.24,title:'수평선',date:'2025·09·28 · 16:18',cam:'Sony α7 IV',lens:'FE 16-35mm GM',f:'f/16',s:'1/250',iso:'64',fl:'16 mm',ev:'−0.3 EV',wb:'5600 K',meter:'Multi',place:'강릉 안목',coords:'37.7730° N, 128.9470° E',tags:['바다','장노출','시스케이프'],likes:221},
];

/* ---------- home grid (masonry, clickable) ---------- */
function tileHTML(i){
  const p = PHOTOS[i];
  return `<figure class="wf-tile" data-i="${i}" style="aspect-ratio:${p.ar}">
      <div class="wf-photo" style="background-image:url(images/${p.img})"></div>
      <button class="like on-photo wf-like" data-likebtn>${pic('heart',17)}</button>
      <figcaption class="wf-ov"><div class="t">${p.title}</div><div class="m">${p.f} · ${p.s} · ISO${p.iso} · ${p.fl}</div></figcaption>
    </figure>`;
}
function renderHome(){
  const order = [...PHOTOS.keys(), 0,1,2,3];
  return order.map(i=>tileHTML(i)).join('');
}

/* ---------- modal panel (B-style, light) ---------- */
function mapMini(p){
  return `<div class="mapw" style="height:148px">
    <svg class="map" viewBox="0 0 400 190" preserveAspectRatio="xMidYMid slice" style="height:148px;width:100%">
      <rect width="400" height="190" fill="var(--map-land)"/>
      <path d="M-10 120 Q 80 90 160 130 T 360 110 L 420 200 L -10 200 Z" fill="var(--map-water)"/>
      <g stroke="var(--map-road)" stroke-width="6" fill="none" stroke-linecap="round" opacity="0.9"><path d="M-10 60 L 410 50"/><path d="M40 -10 L 70 200"/><path d="M210 -10 L 240 200"/><path d="M-10 140 L 410 150"/></g>
      <g stroke="var(--map-road)" stroke-width="2.5" fill="none" opacity="0.6"><path d="M-10 95 L 410 88"/><path d="M130 -10 L 150 200"/><path d="M300 -10 L 320 200"/></g>
    </svg>
    <div class="map-pin"><div class="pulse"></div><div class="pin-dot"></div></div>
    <div class="map-coords"><div class="map-place"><div class="nm">${p.place}</div><div class="co">${p.coords}</div></div></div>
  </div>`;
}

function panelHTML(p, i){
  const liked = p._liked ? 'aria-pressed="true"' : '';
  const dims = ['6000 × 4000','7008 × 4672','5472 × 3648','8256 × 5504'][i%4];
  const file = 'DSC0' + (7400 - i*7) + (p.img.includes('wide')?'.ARW':'.ARW');
  return `
    <div class="mp-head">
      <div class="mp-title">
        <div class="ttl">${p.title}</div>
        <div class="date">${p.date}</div>
      </div>
      <button class="like mp-like" ${liked} data-modallike>${pic('heart',20)} <span class="mp-likes">${p.likes + (p._liked?1:0)}</span></button>
    </div>

    <div class="exif">
      <div class="exif-head"><div class="exif-cam"><span class="body">${p.cam}</span><span class="lens">${p.lens}</span></div></div>
      <div class="triangle">
        <div class="tri"><span class="l">조리개</span><div class="v">${p.f}</div></div>
        <div class="tri"><span class="l">셔터</span><div class="v">${p.s}</div></div>
        <div class="tri"><span class="l">감도</span><div class="v">${p.iso}</div></div>
      </div>
      <div class="exif-list">
        <div class="exif-row"><span class="k">초점거리</span><span class="val">${p.fl}</span></div>
        <div class="exif-row"><span class="k">노출보정</span><span class="val">${p.ev}</span></div>
        <div class="exif-row"><span class="k">화이트밸런스</span><span class="val">${p.wb}</span></div>
        <div class="exif-row"><span class="k">측광</span><span class="val">${p.meter}</span></div>
        <div class="exif-row"><span class="k">플래시</span><span class="val">발광 안 함</span></div>
        <div class="exif-row"><span class="k">크기</span><span class="val">${dims}</span></div>
        <div class="exif-row"><span class="k">촬영일시</span><span class="val">${p.date}</span></div>
        <div class="exif-row"><span class="k">파일</span><span class="val">${file}</span></div>
      </div>
    </div>

    ${mapMini(p)}

    <div class="chiprow">${p.tags.map(t=>`<span class="chip-tag">${t}</span>`).join('')}</div>

    <div class="mp-foot">
      <button class="btn btn-primary" style="flex:1;justify-content:center" data-export>${pic('download',16)} 내보내기</button>
      <button class="btn btn-secondary">${pic('edit',16)} 편집</button>
    </div>`;
}

/* ---------- export flow: 6 frame styles applied to the photo ---------- */
const FRAME_STYLES = [
  ['bar','미니멀 바'],['pola','폴라로이드'],['film','필름'],
  ['mat','갤러리 매트'],['corner','코너'],['side','사이드 데이터'],
];

function metaLine(p, range){
  if(range==='loc') return `${p.f} · ${p.s} · ISO${p.iso} · ${p.place}`;
  if(range==='full') return `${p.cam} · ${p.f} · ${p.s} · ISO${p.iso} · ${p.fl}`;
  return `${p.f} · ${p.s} · ISO${p.iso}`;
}

function framePreview(style, p, o){
  const url = `images/${p.img}`;
  const wm = o.wm ? `<div class="fp-wm">Aperture<span style="color:var(--accent)">.</span></div>` : '';
  const camShort = p.cam.replace(/^(Sony|Fujifilm|Nikon|Leica)\s/,'');
  const ph = (ar, extra='')=>`<div class="fp-ph" style="width:100%;aspect-ratio:${ar};${extra}"><div class="fp-img" style="background-image:url(${url})"></div>${wm}</div>`;
  switch(style){
    case 'bar': return `<div class="fr-bar">${ph('4/5')}<div class="bar"><span class="cam">${camShort} · ${p.fl}</span><span class="ex">${metaLine(p,o.range)}</span></div></div>`;
    case 'pola': return `<div class="fr-pola">${ph('1')}<div class="cap"><div class="ttl">${p.title}</div><div class="ex">${metaLine(p,o.range)}</div></div></div>`;
    case 'film': return `<div class="fr-film"><div class="holes"></div><div class="reb"><span class="t">HSW 400 · ${camShort}</span><span class="no">32A</span></div>${ph('3/2')}<div class="reb"><span class="t">${p.f} · ${p.s} · ISO${p.iso} · ${p.fl}</span><span class="no">»</span></div><div class="holes"></div></div>`;
    case 'mat': return `<div class="fr-mat">${ph('3/2','border:1px solid var(--line-strong)')}<div class="plate"><div class="ttl">${p.title}</div><div class="meta">${camShort} — ${metaLine(p,o.range)}</div></div></div>`;
    case 'corner': return `<div class="fr-corner">${ph('4/5')}<div class="ov"><div class="big">${p.f} · ${p.s} · ISO ${p.iso}</div><div class="sm">${o.range==='loc'?p.place:p.cam+' · '+p.lens}</div></div></div>`;
    case 'side': return `<div class="fr-side"><div class="fp-ph" style="width:62%;flex:none;aspect-ratio:3/4"><div class="fp-img" style="background-image:url(${url})"></div>${wm}</div><div class="panel"><div><div class="k">Aperture</div><div class="v">${p.f}</div></div><div><div class="k">Shutter</div><div class="v">${p.s}</div></div><div><div class="k">ISO</div><div class="v">${p.iso}</div></div><div><div class="k">Camera</div><div class="v">${camShort}</div></div></div></div>`;
  }
  return '';
}

/* ---------- albums ---------- */
const ALBUMS = [
  {title:'도시의 밤', cover:'tone05.png', sub:'2026 · TOKYO·SEOUL', photos:[0,4,7,9]},
  {title:'해안선', cover:'tone12.png', sub:'2025–26 · 제주·강릉', photos:[3,6,8,11]},
  {title:'고요', cover:'tone03.png', sub:'2026 · 풍경', photos:[2,5,10]},
  {title:'스트리트', cover:'tone02.png', sub:'2026 · 거리', photos:[1]},
];
function renderAlbums(){
  const cards = ALBUMS.map((a,i)=>`
    <figure class="alb-card" data-album="${i}">
      <div class="alb-cover"><div class="wf-photo" style="background-image:url(images/${a.cover})"></div><span class="alb-count">${a.photos.length}</span></div>
      <div class="alb-info"><div class="alb-title">${a.title}</div><div class="alb-meta">${a.sub} · ${a.photos.length} photos</div></div>
    </figure>`).join('');
  const add = `<figure class="alb-card alb-new"><div class="alb-cover alb-newcover">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg>
      <div class="nt">새 앨범</div></div></figure>`;
  return cards + add;
}
function renderAlbumDetail(i){
  const a = ALBUMS[i];
  return `<div class="ad-hero" style="background-image:url(images/${a.cover})">
      <div class="ad-hero-scrim"></div>
      <button class="btn ad-back" data-albumback>${pic('chevL',16)} 앨범</button>
      <div class="ad-hero-txt"><div class="ad-title">${a.title}</div><div class="ad-meta">${a.sub} · ${a.photos.length} photos</div></div>
    </div>
    <div class="wf-mason">${a.photos.map(idx=>tileHTML(idx)).join('')}</div>`;
}

/* ---------- map ---------- */
const MAP_POS = [[20,60],[41,30],[66,18],[31,76],[52,46],[82,52],[12,40],[60,70],[88,30],[45,84],[72,46],[27,24]];
function bigMap(){
  return `<svg class="bigmap-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
    <rect width="1000" height="600" fill="var(--map-land)"/>
    <path d="M-20 360 Q 200 280 420 380 T 1020 340 L 1020 620 L -20 620 Z" fill="var(--map-water)"/>
    <g stroke="var(--map-road)" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.85">
      <path d="M-20 160 L 1020 130"/><path d="M120 -20 L 180 620"/><path d="M520 -20 L 600 620"/><path d="M-20 420 L 1020 440"/><path d="M820 -20 L 760 620"/>
    </g>
    <g stroke="var(--map-road)" stroke-width="4" fill="none" opacity="0.55">
      <path d="M-20 260 L 1020 240"/><path d="M340 -20 L 380 620"/><path d="M680 -20 L 700 620"/><path d="M-20 520 L 1020 520"/>
    </g>
  </svg>`;
}
function renderMap(){
  const pins = PHOTOS.map((p,i)=>`<button class="map-pin2" data-i="${i}" style="left:${MAP_POS[i][0]}%;top:${MAP_POS[i][1]}%"><span class="mp-dot"></span><span class="mp-lab">${p.place.split(' ')[0]}</span></button>`).join('');
  const list = PHOTOS.map((p,i)=>`<button class="loc-item" data-i="${i}">
      <div class="loc-thumb" style="background-image:url(images/${p.img})"></div>
      <div class="loc-txt"><div class="loc-place">${p.place}</div><div class="loc-co">${p.coords}</div></div>
    </button>`).join('');
  return `<aside class="map-list"><div class="map-list-head"><span class="u-label">촬영 위치</span><span class="wf-count">${PHOTOS.length} spots</span></div>${list}</aside>
    <div class="map-stage">${bigMap()}<div class="map-pins">${pins}</div></div>`;
}

/* ---------- search + tag filter ---------- */
function allTags(){ const s=new Set(); PHOTOS.forEach(p=>p.tags.forEach(t=>s.add(t))); return ['전체', ...s]; }
function renderTagbar(active){ return allTags().map(t=>`<button class="chip-tag ${t===active?'active':''}" data-tag="${t}">${t}</button>`).join(''); }
function camOptions(){ return ['전체', ...new Set(PHOTOS.map(p=>p.cam))].map(c=>`<option value="${c}">${c}</option>`).join(''); }
function filteredIndexes(tag, q, cam, fMin, fMax){
  q = (q||'').trim().toLowerCase();
  return PHOTOS.map((_,i)=>i).filter(i=>{
    const p = PHOTOS[i];
    if(tag && tag!=='전체' && !p.tags.includes(tag)) return false;
    if(cam && cam!=='전체' && p.cam!==cam) return false;
    const f = parseInt(p.fl,10);
    if(fMin!=null && f<fMin) return false;
    if(fMax!=null && f>fMax) return false;
    if(q){ const hay = [p.title, p.cam, p.lens, p.place, p.tags.join(' ')].join(' ').toLowerCase(); if(!hay.includes(q)) return false; }
    return true;
  });
}
function renderGrid(idxs){ return idxs.length ? idxs.map(i=>tileHTML(i)).join('') : '<div class="empty-grid">검색 결과가 없습니다</div>'; }

/* ---------- about ---------- */
function renderAbout(){
  const cams = [...new Set(PHOTOS.map(p=>p.cam))];
  const lenses = [...new Set(PHOTOS.map(p=>p.lens))];
  const places = [...new Set(PHOTOS.map(p=>p.place.split(' ')[0]))];
  const stat = (n,l)=>`<div class="stat"><div class="sn">${n}</div><div class="sl">${l}</div></div>`;
  const block = (label, items)=>`<div class="about-block"><div class="u-label">${label}</div><ul class="about-list">${items.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  return `<div class="about">
    <header class="about-hero">
      <div class="about-name">Hyunwoo&nbsp;Yang<br><em>— photography</em></div>
      <p class="about-bio">빛과 정적의 도시 풍경. 서울·도쿄·제주에서 장노출과 거리 사진을 찍습니다. 모든 컷에는 촬영 데이터가 함께 기록됩니다. 의뢰·프린트 문의는 언제나 환영합니다.</p>
      <div class="about-contact"><a href="#">Instagram ↗</a><a href="#">Email ↗</a><a href="#">Print Shop ↗</a></div>
    </header>
    <div class="about-stats">${stat(PHOTOS.length,'PHOTOS')}${stat(ALBUMS.length,'ALBUMS')}${stat(places.length,'LOCATIONS')}${stat(cams.length,'BODIES')}</div>
    <div class="about-cols">${block('카메라', cams)}${block('렌즈', lenses)}${block('활동 지역', places)}</div>
  </div>`;
}
