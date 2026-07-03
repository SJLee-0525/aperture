/* dev.js — 개발 섹션 (Sungjoon Lee · Developer). Namespaced window.Dev. Content from SJLee-0525/portfolio. */
(function () {
  const STACK = [
    ["Language", ["TypeScript", "JavaScript", "HTML5"]],
    ["Framework · Library", ["React.js", "React Router", "Zustand"]],
    ["Styling · Motion", ["TailwindCSS", "GSAP", "clsx"]],
    ["Build · Runtime", ["Vite", "Node.js", "Yarn PnP"]],
    ["Quality", ["ESLint", "Prettier", "Lighthouse 90+"]],
  ];
  const QA = [
    {
      q: "Q. 어떤 개발자인가요?",
      a: "사용자에게 명확하게 전달되는 흐름을 설계하고, 인터랙션으로 주목도를 높이는 프론트엔드 개발자입니다.",
      big: true,
    },
    {
      q: "Q. 무엇을 중요하게 여기나요?",
      a: "정적인 화면을 넘어 반응형 레이아웃과 부드러운 전환으로, 정보가 자연스럽게 읽히는 경험을 만드는 것.",
    },
    {
      q: "Q. 최근 관심사는?",
      a: "GSAP 기반 타임라인 애니메이션, 코드 스플리팅과 Lazy Loading을 통한 성능·접근성 개선.",
    },
  ];
  const PROJECTS = [
    {
      y: "2025",
      t: "개인 포트폴리오",
      d: "GSAP 애니메이션과 반응형 레이아웃으로 만든 개발자 포트폴리오. Lighthouse 50 → 90+.",
      tags: ["React", "TypeScript", "TailwindCSS", "GSAP", "Vite", "Zustand"],
      overview:
        "개발자로서의 성장과 경험을 정리하고, 기술 스택과 프로젝트를 소개하기 위해 제작한 개인 포트폴리오 웹사이트.",
      work: [
        "메인·기술스택·자기소개·프로젝트 목록 페이지 UI/UX 설계 및 구현",
        "GSAP·CSS Keyframes 기반 섹션 단위 애니메이션과 로딩 단계 처리",
        "네비게이션 클릭 시 부드러운 스크롤 이동",
        "React createPortal 기반 프로젝트 상세 모달",
        "TailwindCSS 반응형 웹 구현",
      ],
      trouble: [
        "스크롤 방지 시 스크롤바 제거로 레이아웃 깨짐 → 스크롤바 너비만큼 padding-right 보정",
        "새로고침 시 스크롤 위치 복원 → scrollRestoration='manual' + hash 초기화",
        "타이핑 효과 한글 깨짐 → spread operator로 완성형 문자 기준 배열화",
      ],
      links: [
        ["GitHub", "https://github.com/SJLee-0525/portfolio"],
        ["Live", "https://sjlee12.netlify.app/"],
      ],
    },
    {
      y: "2025",
      t: "사진 포트폴리오",
      d: "사진가를 위한 메타데이터 중심 갤러리. EXIF 스펙시트·지도·프레임 내보내기.",
      tags: ["React", "HTML/CSS", "Canvas", "Vanilla JS"],
      overview:
        "조리개·셔터·ISO 등 EXIF를 계기판처럼 보여주고, 앨범·지도·라이트박스·내보내기 프레임까지 갖춘 사진 포트폴리오.",
      work: [
        "EXIF 스펙시트·노출 삼각형 컴포넌트",
        "메이슨리/정사각 그리드 + 라이트박스 모달",
        "촬영 위치 지도 + 6종 내보내기 프레임",
      ],
      trouble: [
        "웹컴포넌트 shadow DOM 이미지 캡처 이슈 → 상태 검증으로 우회",
        "프레임 텍스트 오버플로 → overflow 클리핑 + 말줄임",
      ],
      links: [["열기", "Portfolio.html"]],
    },
    {
      y: "2024",
      t: "실시간 협업 대시보드",
      d: "WebSocket 기반 팀 대시보드. 상태 동기화와 낙관적 업데이트.",
      tags: ["React", "TypeScript", "WebSocket", "Zustand"],
      overview:
        "여러 사용자가 동시에 작업하는 대시보드. 실시간 상태 동기화와 낙관적 UI 업데이트를 구현.",
      work: [
        "WebSocket 이벤트 기반 상태 스토어 설계",
        "낙관적 업데이트와 롤백 처리",
        "권한별 뷰 렌더링",
      ],
      trouble: ["동시 편집 충돌 → 서버 타임스탬프 기준 병합", "재연결 시 상태 복원 로직"],
      links: [["GitHub", "#"]],
    },
    {
      y: "2024",
      t: "디자인 시스템 UI 키트",
      d: "재사용 가능한 컴포넌트 라이브러리와 토큰 시스템.",
      tags: ["React", "TypeScript", "Storybook", "CSS Vars"],
      overview: "팀 전반에서 쓰는 버튼·폼·모달 등 컴포넌트를 토큰 기반으로 정리한 UI 키트.",
      work: [
        "CSS 변수 기반 라이트/다크 토큰",
        "접근성 고려한 폼·모달 컴포넌트",
        "Storybook 문서화",
      ],
      trouble: ["토큰 네이밍 충돌 → 시맨틱 레이어 분리"],
      links: [["GitHub", "#"]],
    },
  ];
  const TIMELINE = [
    {
      y: "2025 — 현재",
      t: "프론트엔드 개발자",
      r: "개인 프로젝트 · 프리랜스",
      d: "React·TypeScript 기반 웹 애플리케이션과 인터랙티브 포트폴리오를 설계·구현.",
    },
    {
      y: "2024",
      t: "프론트엔드 부트캠프 수료",
      r: "SSAFY / 우수 수료",
      d: "알고리즘·CS 기초와 실전 프로젝트. 팀 프로젝트에서 프론트엔드 리드.",
    },
    {
      y: "2023",
      t: "첫 웹 프로젝트",
      r: "Vanilla JS · React 입문",
      d: "JavaScript로 시작해 React 생태계로 확장. 상태관리와 컴포넌트 설계를 학습.",
    },
  ];
  const TYPE_WORDS = [
    "Frontend Engineer",
    "React Developer",
    "UI Craftsman",
    "Interaction Designer",
  ];
  const AR =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  const GH =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.5 2 2 6.6 2 12.3c0 4.5 2.9 8.3 6.8 9.7.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10.3 10.3 0 0 0 22 12.3C22 6.6 17.5 2 12 2z"/></svg>';

  function render() {
    const qa = QA.map(
      (x) =>
        `<div class="reveal"><div class="q">${x.q}</div><div class="a${x.big ? "" : " small"}">${x.a}</div></div>`,
    ).join("");
    const stack = STACK.map(
      ([c, items]) =>
        `<div class="dv-scat reveal"><div class="cl">${c}</div><div class="dv-chips">${items.map((i) => `<span class="dv-chip">${i}</span>`).join("")}</div></div>`,
    ).join("");
    const projects = PROJECTS.map(
      (p, i) =>
        `<article class="dv-proj reveal" data-proj="${i}"><span class="parrow">${AR}</span><div class="pyear">${p.y}</div><div class="pt">${p.t}</div><div class="pd">${p.d}</div><div class="ptags">${p.tags.map((t) => `<span>${t}</span>`).join(" · ")}</div></article>`,
    ).join("");
    const timeline = TIMELINE.map(
      (t) =>
        `<div class="dv-tl reveal"><div class="ty">${t.y}</div><div class="tt">${t.t}</div><div class="tr">${t.r}</div><div class="td">${t.d}</div></div>`,
    ).join("");
    return `<div class="dv-load" id="dv-load"><div class="lc"><div class="ln">LOADING · SUNGJOON.DEV</div><div class="lbar"><i></i></div></div></div>
    <div class="dv" id="dv-top">
      <section class="dv-hero" id="dv-hero">
        <div class="dv-eyebrow">DEVELOPER</div>
        <div class="dv-type"><span id="dv-typed"></span><span class="cursor">&nbsp;</span></div>
        <p class="dv-lead">사용자에게 명확하게 전달되는 흐름을 설계하고, GSAP 기반 애니메이션과 반응형 레이아웃으로 주목도를 높이는 프론트엔드 개발자입니다.</p>
        <div class="dv-links">
          <a class="primary" href="https://github.com/SJLee-0525" target="_blank">${GH} GitHub</a>
          <a href="mailto:dev@sungjoonlee.com">Email</a>
          <a href="#dv-projects" data-devscroll="projects">프로젝트 보기 ↓</a>
        </div>
      </section>

      <section class="dv-sec" id="dv-about">
        <div class="dv-shead"><span class="num">01</span><h2>소개 · 인터뷰</h2></div>
        <div class="dv-qa">${qa}</div>
      </section>

      <section class="dv-sec" id="dv-stack">
        <div class="dv-shead"><span class="num">02</span><h2>기술 스택</h2></div>
        <div class="dv-stack">${stack}</div>
      </section>

      <section class="dv-sec" id="dv-projects">
        <div class="dv-shead"><span class="num">03</span><h2>프로젝트</h2></div>
        <div class="dv-projects">${projects}</div>
      </section>

      <section class="dv-sec" id="dv-career">
        <div class="dv-shead"><span class="num">04</span><h2>경력 · 타임라인</h2></div>
        <div class="dv-timeline">${timeline}</div>
      </section>

      <section class="dv-sec" id="dv-contact">
        <div class="dv-shead"><span class="num">05</span><h2>연락처</h2></div>
        <div class="dv-contact">
          <div class="big">함께 만들고 싶다면<br><a href="mailto:dev@sungjoonlee.com">dev@sungjoonlee.com</a></div>
          <div class="row">
            <a class="dv-chip" href="https://github.com/SJLee-0525" target="_blank" style="text-decoration:none">GitHub ↗</a>
            <a class="dv-chip" href="#" style="text-decoration:none">Resume ↗</a>
          </div>
        </div>
      </section>
    </div>

    <div class="dv-modal" id="dv-modal"><div class="sc" data-devclose></div><div class="sh" id="dv-modal-sh"></div></div>`;
  }

  function projHTML(p) {
    return `<div class="mh"><span class="cr">Project · ${p.y}</span><button class="x" data-devclose>✕</button></div>
      <div class="mb">
        <div class="pt">${p.t}</div>
        <div class="banner">PROJECT IMAGE</div>
        <div class="sec-l">Overview</div><p>${p.overview}</p>
        <div class="sec-l">담당 · 주요 작업</div><ul>${p.work.map((w) => `<li>${w}</li>`).join("")}</ul>
        <div class="sec-l">트러블슈팅</div><ul>${p.trouble.map((t) => `<li>${t}</li>`).join("")}</ul>
        <div class="sec-l">Stack</div><div class="mtags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
        <div class="mbtns">${p.links.map(([l, h]) => `<a class="btn ${l === "GitHub" || l === "Live" || l === "열기" ? "btn-primary" : "btn-secondary"}" href="${h}" ${h.startsWith("http") ? 'target="_blank"' : ""} style="text-decoration:none">${l} ↗</a>`).join("")}</div>
      </div>`;
  }

  let typeTimer = null,
    ioObs = null,
    typedStarted = false;
  function startType(root) {
    if (typedStarted) return;
    typedStarted = true;
    const el = root.querySelector("#dv-typed");
    if (!el) return;
    let wi = 0,
      ci = 0,
      del = false;
    function tick() {
      const w = TYPE_WORDS[wi];
      el.textContent = del ? w.slice(0, ci--) : w.slice(0, ci++);
      if (!del && ci > w.length) {
        del = true;
        ci = w.length;
        typeTimer = setTimeout(tick, 1400);
        return;
      }
      if (del && ci < 0) {
        del = false;
        ci = 0;
        wi = (wi + 1) % TYPE_WORDS.length;
        typeTimer = setTimeout(tick, 240);
        return;
      }
      typeTimer = setTimeout(tick, del ? 45 : 85);
    }
    tick();
  }
  function revealObserve(root) {
    if (ioObs) ioObs.disconnect();
    ioObs = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            ioObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14 },
    );
    root.querySelectorAll(".reveal").forEach((el) => ioObs.observe(el));
  }

  function init(root) {
    const modal = root.querySelector("#dv-modal");
    const sh = root.querySelector("#dv-modal-sh");
    function openModal(html) {
      sh.innerHTML = html;
      modal.classList.add("open");
      document.body.style.overflow = "hidden";
    }
    function closeModal() {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }
    root.addEventListener("click", (e) => {
      if (e.target.closest("[data-devclose]")) return closeModal();
      const pr = e.target.closest("[data-proj]");
      if (pr) {
        openModal(projHTML(PROJECTS[+pr.dataset.proj]));
        return;
      }
      const sc = e.target.closest("[data-devscroll]");
      if (sc) {
        e.preventDefault();
        nav(sc.dataset.devscroll, root);
        return;
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
    revealObserve(root);
  }
  // called when the dev section becomes visible
  function activate(root) {
    const load = root.querySelector("#dv-load");
    if (load && !load.classList.contains("done")) {
      setTimeout(() => load.classList.add("done"), 1050);
    }
    startType(root);
    revealObserve(root);
  }
  function nav(sub, root) {
    const map = {
      about: "dv-about",
      stack: "dv-stack",
      projects: "dv-projects",
      career: "dv-career",
      contact: "dv-contact",
    };
    const el = root.querySelector("#" + (map[sub] || "dv-top"));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  window.Dev = { render, init, activate, nav };
})();
