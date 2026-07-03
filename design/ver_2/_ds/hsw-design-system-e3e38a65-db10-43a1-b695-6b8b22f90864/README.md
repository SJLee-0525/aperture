# HSW Design System — Hello, Super World!

> **Kinetic Crypto-Brutalism.** A digital cockpit for autonomous agents and elite researchers. Gold on black. Zero radius. Space Grotesk headlines.

---

## 1 · Product context

**HSW (Hello, Super World!)** is a sovereign-intelligence R&D platform — an OS-style environment for running autonomous AI agents against research workloads. The system is metaphorically modeled on a **Lamborghini / F1 racing cockpit**: every surface feels like a high-performance instrument cluster. The product is _not_ a friendly consumer tool; it's a proprietary terminal for elite operators.

### Products / surfaces represented

| Surface                       | Racing metaphor | What it does                                     |
| ----------------------------- | --------------- | ------------------------------------------------ |
| **Dashboard (Cockpit HUD)**   | Pit Box         | System health, gauges, telemetry feed            |
| **Garage (Skills Browser)**   | Engine Bay      | Install/swap/manage skills like racing parts     |
| **Recon (Pit Wall Briefing)** | Pit Wall        | AI-curated intelligence from GitHub / arXiv / HN |
| **Race (MetaLoop)**           | Timing Tower    | Live multi-agent execution, lap-by-lap           |

### Sources (read-only, supplied by the user)

- `design/DESIGN.md` — strategy doc ("Kinetic Crypto-Brutalism")
- `design/DESIGN_SYSTEM.md` — authoritative implementation spec (2026-04-08)
- `design/LAMBORGHINI_DESIGN_ANALYSIS.md` — per-page breakdown (Korean)
- Referenced but **not provided** in this project: `design/lamborghini/*/code.html` mockups, `design/lamborghini/*/screen.png` screenshots, `web/src/**` Next.js source, `design/IMPLEMENTATION_SPEC.md`. If you have access, cross-reference — we worked from the three markdown files only.

---

## 2 · Index (manifest)

| Path                  | Purpose                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `README.md`           | This file — the entry point                                                                |
| `SKILL.md`            | Agent-Skill frontmatter — makes this folder loadable as a Claude Code skill                |
| `colors_and_type.css` | **Single source of truth** for tokens — CSS vars + semantic classes + textures + keyframes |
| `fonts/README.md`     | Font usage (Google Fonts CDN — Space Grotesk, Inter, JetBrains Mono)                       |
| `assets/`             | Logos, brand marks, tileable patterns (hex, carbon-fiber)                                  |
| `preview/`            | Design-system spec cards rendered as HTML (one concern per card)                           |
| `ui_kits/dashboard/`  | Cockpit HUD UI kit — React components + interactive `index.html`                           |

---

## 3 · Content fundamentals

### Voice

The HSW voice is **terse, technical, confident, and slightly theatrical**. We speak in the vocabulary of a race engineer talking to their driver: short commands, telemetry jargon, and metaphors borrowed from pit-lane operations. We do **not** cozy up to users. Warmth is a liability; precision is the product.

### Casing & typography

- **UPPERCASE + wide tracking (0.2em / 0.3em)** for anything labeled: panel titles, badges, CTAs, section headers. Every label feels engraved.
- **Sentence case** for actual running body text (rare — we prefer data over prose).
- **`snake_case`** and **`SCREAMING_SNAKE_CASE`** are part of the vocabulary — project names, skill ids, circuit names all use it (`METALOOP_ALPHA_09`, `TENSOR_CORE_X9`, `hsw@system:~$`). This is _intentional_ and reinforces the terminal aesthetic.
- **Numerical precision.** `98%`, `842 tok/s`, `01:23.4`. Always show units, always use mono.

### Pronouns

Mostly absent. We address the system, not a human. When we do address the user, it is as **"operator"** or (rare) **"you"** — never "we" or "our". Copy tends to imperative: _"Launch loop. Swap part. Retire."_

### Emoji

**Never.** Emoji are antithetical to the aesthetic. Use a gold diamond, uppercase labels, or a Material Symbols icon — never 🚀 or ✨.

### Examples (verbatim from the spec)

- Brand: **"Hello, Super World!"** (punctuation in gold — the only exception to the "no warmth" rule; it's an inside joke that reads as confident, not friendly).
- Status: **"IDLE"**, **"ACTIVE"**, **"PITTING..."**, **"COMPLETE"**, **"RETIRE"**.
- Terminal: **`[SYS] HSW Platform v2.0 initialized`** · **`> hsw@system:~$`**.
- Page titles: **"COCKPIT"**, **"ENGINE_BAY // COMPONENT_SWAP"**, **"CIRCUIT: METALOOP_ALPHA_09"**.
- CTA copy: **"NEW LOOP"**, **"SWAP PART"**, **"LAUNCH"**, **"RETIRE"**.
- Data labels: **`EVOLUTION`**, **`VELOCITY`**, **`ENDURANCE`**, **`THERMAL`**, **`ML_RANK`**.

Write copy as if you're printing it on a 1970s F1 dashboard: no filler words, no apologies, no cheerfulness.

---

## 4 · Visual foundations

### Palette — gold + cool monochrome only

- **One chromatic color: `#FFC000` gold.** It is the _only_ accent. Hover darkens to `#D4A000`; queued/warning uses the deeper `#917300`. Success and error are **both gold** (gold for success, deep gold for error — no green, no red, ever).
- **Surfaces stack from `#000` → `#252525`** in 6 steps. Depth is signaled by surface shift, never shadow.
- **Text is a 9-step white → `#606060` ramp.** All cool grays. Mixing warm grays is forbidden.
- **Cyan `#00DDFE` exists but is gated** — only AI-generated suggestions / technical callouts. Never branding, never UI chrome.

### Type

- **Space Grotesk** for every label, title, badge, CTA — uppercase, wide tracking, heavy weights (700–900).
- **Inter** for body (rare; we prefer data over paragraphs).
- **JetBrains Mono** for every number, timestamp, terminal line, version string, metric.
- Display numerals are set **italic**; it's the one place italics appear.
- Never smaller than 10px; never opacity below 0.3 on readable text.

### Borders & "no-line" rule

- 1px flat borders are **strictly prohibited** for sectioning. If two regions differ, put them on different surface tiers (`#141414` next to `#1c1c1c`) or texturize one.
- When borders _do_ appear, they are `rgba(255,255,255,0.04)` → `0.10` (near-invisible), or gold at 10/20/30% for focus/active states.
- **Left-border accents (`w-1.5` solid gold)** on cards indicate status — gold = active, deep gold = queued, gray = done. This is the _only_ sanctioned "colored left border" pattern and is specific to status, not decoration.

### Elevation

- **Tonal, never drop-shadow.** An "elevated" card moves from `surface-mid` to `surface-high` — no `box-shadow` for depth.
- The **only sanctioned shadows** are (a) `inset 0 0 20px rgba(0,0,0,0.5)` inside glass panels, and (b) `0 0 20px rgba(255,192,0,0.1)` gold glow on active CTAs and gauge arcs.

### Backgrounds & textures

- Pure black `#000` at the lowest layer.
- **`hex-bg`** — hex-grid SVG tile on every dashboard page at ~4% opacity; signifies "MetaLoop autonomous zone".
- **`carbon-texture`** — 45°-rotated 4px weave on MetaSkill cards; signifies "industrial output".
- **`hud-scanline`** — a single `linear-gradient` stripe at 3% opacity across the whole viewport; CRT-terminal cue.
- **`gold-radial`** — soft 4%-opacity gold glow at left edge of hero cluster. Never used elsewhere.
- **No photography. No illustrations. No gradients that blend colors.** Every background is programmatic.

### Radii

- **0px everywhere. No exceptions.** The only curves in the entire system are (a) SVG circular gauges and (b) 45°-rotated diamond shapes used as glyphs.

### Animation

- **Purposeful, short, looped.** Gauge fills animate in on page load (stroke-dashoffset over ~1.2s, ease-out). Gold glow pulses on active states (`2s` ease-in-out infinite). Radar sweeps rotate (`4s` linear infinite). Cursor blinks (`1s` step-end).
- **Easing:** `ease-in-out` for pulses, `linear` for sweeps/scrolling tickers, `ease-out` for entrances.
- **Never bouncy / spring / overshoot easings** — they read as consumer-playful.
- Cap at **3 concurrent animations per viewport**.

### Hover & press

- **Hover:** background lifts from `bg-[#0a0a0a]/60` → `bg-[#FFC000]/5` (a 5% gold wash). On CTAs, the gold swaps from `#FFC000` → `#D4A000`. Never use opacity dimming.
- **Active / press:** gold left-border appears OR a 1px gold glow border turns on (`1px solid #FFC000` + `drop-shadow(0 0 4px rgba(255,192,0,0.6))`).
- **Focus:** the gold glow border (same as active). No blue browser default — override globally.
- **No scale/shrink on press.** The cockpit doesn't wobble.

### Transparency & blur

- `cluster-glass` uses `backdrop-filter: blur(10px)` on a 4% white → 50% black diagonal gradient. Used only on major panel containers. Do not stack blur layers.
- All other surfaces are **fully opaque**. No frosted cards, no translucent modals.

### Layout rules

- **Fixed 52px icon sidebar** on the left (desktop).
- **Fixed 56px top nav** with brand + breadcrumb.
- **3-col bento grid** below the cluster gauge on dashboards (`grid-cols-1 lg:grid-cols-3 gap-6`).
- Page padding `p-4` → `lg:p-6`. Panel padding `p-6`. Card internal padding `p-4` → `p-5`. Section gap `space-y-6`. Item gap `space-y-3`.
- **Asymmetric layouts are preferred.** A heavy sidebar with a data-dense right field beats a centered column.

### Cards

Cards have **no rounding, no drop shadow, no outer border in most cases**. They are a surface-tier shift (`#141414` on `#080808`) plus, when active, a 2px gold left-border. Panel-level cards use `.cluster-glass` for the glass gradient + 1px gold-faint top border.

### Imagery

There is none. The product never shows photos, illustrations, or AI-generated art. All "imagery" is either data visualization (SVG gauges, sparklines, bar arrays) or texture (hex, carbon, scanlines). If you feel the urge to add a photo, reach for a gauge instead.

---

## 5 · Iconography

### System in use

- **Material Symbols Outlined** — linked from Google Fonts CDN. This is the _only_ sanctioned icon set. Load with:
  ```html
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
    rel="stylesheet"
  />
  ```
  Use with `<span class="material-symbols-outlined">terminal</span>`.
- **Weight:** 400 (regular stroke), never filled. The outlined-thin-stroke look pairs with the brutalist typography.
- **Size:** 16px in dense panels, 20px in sidebar, 24px for feature callouts. Color inherits: active → `#FFC000`, idle → `#909090`, hover → `#d0d0d0`.

### Custom glyphs

- **The gold diamond** (`<div class="w-2 h-2 bg-[#FFC000] rotate-45">` or `assets/logo-mark.svg`). It's the brand mark, a "live" indicator, and a list bullet — all at once.
- **Gold left-border strip** (`w-1.5 h-full bg-[#FFC000]`) — a "status icon" for cards.
- **SVG circular gauges** — not strictly icons, but drawn-from-scratch each time. See `ui_kits/dashboard/Gauge.jsx` for the canonical version.

### Emoji, unicode, raster

- **Emoji:** never.
- **Unicode glyphs:** sparingly. `>` (terminal prompt), `»` or `>>` (tertiary-button directional suffix), `·` (meta separator), `|` (nav divider in TopNav, at 30% gold). Nothing else.
- **PNG/raster icons:** never in the product UI.

### Substitution flag

> ⚠️ We **substitute** Material Symbols Outlined because the source markdown references iconography casually (`<!-- icon -->` placeholders) without naming a specific set. If the actual HSW product ships a different icon system, swap it here and re-render the UI kit. The closest CDN match to what the mockups imply (thin, technical outline icons) is Material Symbols Outlined at weight 400.

---

## 6 · Getting started

1. Pull in the token sheet: `<link rel="stylesheet" href="colors_and_type.css">`.
2. Pull in the icons + fonts via Google Fonts CDN (colors_and_type.css imports fonts; add Material Symbols separately if you need icons).
3. Reference `ui_kits/dashboard/` for working React components.
4. Obey the **no-radius, gold-only, mono-for-numbers** rules. When in doubt, read [VISUAL FOUNDATIONS](#4--visual-foundations) again.

---

## 7 · Caveats

- The source Next.js codebase and the 9 HTML mockups under `design/lamborghini/*/` were referenced in the spec docs but **not supplied** in this project. Everything here is extrapolated faithfully from the three markdown files. If the real code drifts, treat the code as canon and update this folder.
- Material Symbols Outlined is a **flagged substitution** — see above.
- No static font files are bundled — Google Fonts CDN only.
