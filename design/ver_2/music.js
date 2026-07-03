/* music.js — 음악 섹션 (Sungjoon Lee · Pianist). Namespaced under window.Music. */
(function(){
  const WORKS = [
    { t:'Winterreise', sub:'Schubert · D.911', d:'2026.03.14', time:'19:30', v:'예술의전당 콘서트홀', tag:'리사이틀', program:['Gute Nacht','Die Wetterfahne','Gefrorne Tränen','Erstarrung','Der Lindenbaum','Wasserflut'], desc:'슈베르트 겨울 나그네 전곡. 24개의 가곡을 하나의 긴 호흡으로.' },
    { t:'Chopin Recital', sub:'Chopin', d:'2025.11.02', time:'17:00', v:'롯데콘서트홀', tag:'리사이틀', program:['Ballade No.1 in G minor','Nocturne Op.27 No.2','Scherzo No.2','Polonaise-Fantaisie'], desc:'쇼팽의 발라드와 스케르초를 중심으로 한 프로그램.' },
    { t:'Rachmaninoff No.2', sub:'with KBS Symphony', d:'2025.06.20', time:'20:00', v:'세종문화회관 대극장', tag:'협연', program:['Piano Concerto No.2 in C minor, Op.18'], desc:'라흐마니노프 피아노 협주곡 2번. KBS 교향악단과 협연.' },
    { t:'Schubert Sonatas', sub:'Schubert', d:'2025.02.15', time:'19:30', v:'금호아트홀 연세', tag:'리사이틀', program:['Sonata in A, D.959','Sonata in B-flat, D.960'], desc:'슈베르트 후기 소나타 두 곡.' },
    { t:'New Year Gala', sub:'Various', d:'2025.01.01', time:'17:00', v:'예술의전당', tag:'갈라', program:['Liszt · Liebestraum No.3','Debussy · Clair de lune','Encore Selections'], desc:'새해 갈라 콘서트.' },
    { t:'Brahms & Schumann', sub:'Duo', d:'2024.10.08', time:'19:30', v:'예술의전당 IBK챔버홀', tag:'협연', program:['Brahms · Cello Sonata No.1','Schumann · Fantasiestücke'], desc:'첼로와 함께한 듀오 무대.' },
    { t:'Debussy · Ravel', sub:'French Programme', d:'2024.05.19', time:'17:00', v:'금호아트홀', tag:'리사이틀', program:['Debussy · Estampes','Ravel · Gaspard de la nuit'], desc:'프랑스 인상주의 프로그램.' },
    { t:'Goldberg Variations', sub:'J.S. Bach', d:'2024.02.11', time:'19:00', v:'LG아트센터', tag:'리사이틀', program:['Goldberg Variations, BWV 988'], desc:'바흐 골드베르크 변주곡 전곡.' },
    { t:'Mozart Concertos', sub:'with Korean Chamber', d:'2023.11.23', time:'20:00', v:'롯데콘서트홀', tag:'협연', program:['Concerto No.20 in D minor, K.466','Concerto No.23 in A, K.488'], desc:'모차르트 협주곡 두 곡.' },
  ];
  const SCHEDULE = [
    { d:'07.12', y:'2026', t:'Summer Solo Recital', v:'예술의전당 IBK챔버홀', status:'예매 중', on:true },
    { d:'08.03', y:'2026', t:'Beethoven Concerto No.5 “Emperor”', v:'롯데콘서트홀', status:'예매 중', on:true },
    { d:'09.21', y:'2026', t:'Duo Concert — with cello', v:'금호아트홀 연세', status:'오픈 예정', on:false },
    { d:'11.08', y:'2026', t:'Autumn Lieder Evening', v:'예술의전당 콘서트홀', status:'오픈 예정', on:false },
  ];
  const AWARDS = [
    { y:'2024', n:'국제 피아노 콩쿠르 — 파이널리스트', place:'Geneva, CH', desc:'세계적 권위의 콩쿠르 결선에 올라 협주곡 라운드를 연주했다.' },
    { y:'2022', n:'부조니 콩쿠르 — 2위', place:'Bolzano, IT', desc:'부조니 국제 피아노 콩쿠르에서 2위와 함께 청중상을 받았다.' },
    { y:'2021', n:'리즈 콩쿠르 — 세미파이널', place:'Leeds, UK', desc:'리즈 국제 피아노 콩쿠르 준결선에 진출했다.' },
    { y:'2020', n:'서울 음악 콩쿠르 — 1위', place:'Seoul, KR', desc:'국내 최정상 콩쿠르에서 1위를 차지했다.' },
    { y:'2019', n:'한국 청년 음악가상', place:'Seoul, KR', desc:'그해 가장 주목받은 신예 음악가에게 주어지는 상을 받았다.' },
    { y:'2018', n:'영 콘서트 아티스트 — 수상', place:'New York, US', desc:'국제 오디션을 통해 북미 데뷔 무대 기회를 얻었다.' },
  ];
  const VIDEOS = [
    { t:'Schubert · Impromptu Op.90 No.3', s:'Live at 예술의전당 · 2025', id:'' },
    { t:'Rachmaninoff · Prélude Op.23 No.5', s:'Studio session · 2024', id:'' },
    { t:'Debussy · Clair de lune', s:'Encore · 롯데콘서트홀', id:'' },
    { t:'Bach · Goldberg, Aria', s:'LG아트센터 · 2024', id:'' },
  ];
  const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  const TYPE_WORDS = ['Schubert · Winterreise','Rachmaninoff · Concerto No.2','Chopin · Ballades','Bach · Goldberg'];
  const AR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 17L17 7M9 7h8v8"/></svg>';

  function head(num, title, desc, id){
    return `<div class="mu-head"><div class="l"><span class="num">${num}</span><h2>${title}</h2></div><span class="desc">${desc}</span></div>`;
  }

  function render(){
    const works = WORKS.map((w,i)=>`
      <figure class="mu-work" data-work="${i}">
        <div class="poster">POSTER<span class="tag">${w.tag}</span><span class="ar">${AR}</span></div>
        <div class="wt">${w.t}</div><div class="ws">${w.sub}</div>
        <div class="wm">${w.d} · ${w.v}</div>
      </figure>`).join('');
    const sch = SCHEDULE.map(s=>`
      <div class="row"><div class="dt">${s.d} <span class="y">${s.y}</span></div>
        <div><div class="tt">${s.t}</div><div class="vv">${s.v}</div></div>
        <div class="st ${s.on?'':'soon'}">${s.status}</div></div>`).join('');
    const aw = AWARDS.map((a,i)=>`
      <div class="row" data-award="${i}"><div class="yr">${a.y}</div>
        <div class="an">${a.n}</div><div class="ap">${a.place}</div></div>`).join('');
    const vid = VIDEOS.map((v,i)=>`
      <div class="mu-v" data-video="${i}">
        <div class="facade"><div class="vt">${v.t}</div><div class="vs">${v.s}</div></div>
        <div class="play">${PLAY}</div>
      </div>`).join('');

    return `<div class="mu" id="mu-top">
      <section class="mu-hero" id="mu-hero">
        <div class="mu-eyebrow">PIANIST</div>
        <h1>Sungjoon Lee<br><span class="role">the pianist</span></h1>
        <div class="mu-type"><span id="mu-typed"></span><span class="cursor">&nbsp;</span></div>
        <p class="mu-lead">서울을 기반으로 활동하는 피아니스트. 슈베르트와 라흐마니노프 사이를 오가며, 정교한 구조 감각과 노래하는 음색으로 무대를 만듭니다.</p>
        <div class="mu-links">
          <a class="primary" href="#" target="_blank">YouTube</a>
          <a href="#" target="_blank">Instagram</a>
          <a href="#mu-works" data-muscroll="works">연주 목록 보기 ↓</a>
        </div>
      </section>

      <section class="mu-sec" id="mu-works">
        ${head('01','연주 목록','포스터를 눌러 프로그램·예매')}
        <div class="mu-works">${works}</div>
      </section>

      <section class="mu-sec" id="mu-schedule">
        ${head('02','공연 일정','2026 시즌')}
        <div class="mu-sch">${sch}</div>
      </section>

      <section class="mu-sec" id="mu-awards">
        ${head('03','수상 경력','국내·국제')}
        <div class="mu-aw">${aw}</div>
      </section>

      <section class="mu-sec" id="mu-media">
        ${head('04','영상','실황 · 스튜디오')}
        <div class="mu-vid">${vid}</div>
      </section>

      <section class="mu-sec" id="mu-contact">
        ${head('05','연락처','공연 문의 · 소셜')}
        <div class="mu-contact">
          <div class="lead">함께 무대를 만들 분을 기다립니다.</div>
          <div>
            <div class="grp"><div class="k">공연 문의</div><a href="mailto:booking@sungjoonlee.com">booking@sungjoonlee.com</a></div>
            <div class="grp"><div class="k">소셜</div><a href="#">Instagram ↗</a><a href="#">YouTube ↗</a></div>
          </div>
        </div>
      </section>
    </div>

    <div class="mu-modal" id="mu-modal"><div class="sc" data-muclose></div><div class="sh" id="mu-modal-sh"></div></div>`;
  }

  function recitalHTML(w){
    return `<div class="mh"><span class="cr">리사이틀 · 프로그램 · 예매</span><button class="x" data-muclose>✕</button></div>
      <div class="mb"><div class="mrec">
        <div class="poster">POSTER</div>
        <div>
          <div class="rt">${w.t}</div><div class="rsub">${w.sub}</div>
          <div class="rmeta">${w.d} · ${w.time}</div><div class="rv">${w.v}</div>
          <div class="rbtns"><button class="btn btn-primary">예매하기</button><button class="btn btn-secondary">공유</button></div>
          <div class="prog"><div class="ph">프로그램</div>
            ${w.program.map((p,i)=>`<div class="pr"><span class="pn">${String(i+1).padStart(2,'0')}</span><span class="pt">${p}</span></div>`).join('')}
          </div>
          <p style="font-size:14px;color:var(--text-3);line-height:1.7;margin-top:20px">${w.desc}</p>
        </div>
      </div></div>`;
  }
  function awardHTML(a){
    return `<div class="mh"><span class="cr">수상 · ${a.y}</span><button class="x" data-muclose>✕</button></div>
      <div class="mb"><div class="maward">
        <div class="ay">${a.y}</div><div class="an">${a.n}</div><div class="ap">${a.place}</div>
        <p class="ad">${a.desc}</p>
      </div></div>`;
  }

  let typeTimer=null, typedStarted=false;
  function startType(root){
    if(typedStarted) return; typedStarted=true;
    const el=root.querySelector('#mu-typed'); if(!el) return;
    let wi=0, ci=0, del=false;
    function tick(){
      const w=TYPE_WORDS[wi];
      el.textContent = del ? w.slice(0,ci--) : w.slice(0,ci++);
      if(!del && ci>w.length){ del=true; ci=w.length; typeTimer=setTimeout(tick,1500); return; }
      if(del && ci<0){ del=false; ci=0; wi=(wi+1)%TYPE_WORDS.length; typeTimer=setTimeout(tick,240); return; }
      typeTimer=setTimeout(tick, del?45:80);
    }
    tick();
  }
  function init(root){
    const modal = root.querySelector('#mu-modal');
    const sh = root.querySelector('#mu-modal-sh');
    function openModal(html){ sh.innerHTML = html; modal.classList.add('open'); document.body.style.overflow='hidden'; }
    function closeModal(){ modal.classList.remove('open'); document.body.style.overflow=''; }
    root.addEventListener('click', e=>{
      if(e.target.closest('[data-muclose]')) return closeModal();
      const w = e.target.closest('[data-work]'); if(w){ openModal(recitalHTML(WORKS[+w.dataset.work])); return; }
      const a = e.target.closest('[data-award]'); if(a){ openModal(awardHTML(AWARDS[+a.dataset.award])); return; }
      const v = e.target.closest('[data-video]'); if(v){ const idx=+v.dataset.video; const vid=VIDEOS[idx];
        v.innerHTML = vid.id ? `<iframe src="https://www.youtube.com/embed/${vid.id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : `<div class="facade" style="background:#111"><div class="vt">${vid.t}</div><div class="vs">유튜브 영상 ID를 연결하면 여기서 재생됩니다</div></div>`;
        return; }
      const sc = e.target.closest('[data-muscroll]'); if(sc){ e.preventDefault(); nav(sc.dataset.muscroll, root); return; }
    });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && modal.classList.contains('open')) closeModal(); });
  }
  function nav(sub, root){
    const map = { bio:'mu-bio', works:'mu-works', schedule:'mu-schedule', awards:'mu-awards', media:'mu-media', contact:'mu-contact' };
    const el = root.querySelector('#'+(map[sub]||'mu-top')); if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
  }
  window.Music = { render, init, nav, startType };
})();
