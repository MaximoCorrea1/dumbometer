# Dumbometer Design System

Brutalist-candy: near-black terminal base, hard offset shadows, sharp borders, film
grain, full candy-neon accents, big bold Bricolage with JetBrains Mono. "iOS clean"
here means precision (perfect alignment, restrained color, buttery motion), not soft
rounding.

These tokens are canonical. They refine the draft palette in
`docs/superpowers/plans/2026-06-16-dumbometer-site.md`; where they differ, these win.
Voice and copy live in `brand/BRAND.md`.

## Tokens

```css
:root{
  /* base */
  --bg:#0a0b0d; --panel:#101216; --ink:#f3f1e9; --dim:#9a9c96; --line:#ffffff14;

  /* state ramp -> meter + state semantics ONLY */
  --smart:#5dff57; --coasting:#9be34a; --foggy:#ffd23f; --cooked:#ff7a1e; --dumb:#ff2e2e;

  /* candy accents -> CTAs, mascot ring, eyebrows, hovers, links */
  --acid:#c6ff3a;            /* signature accent */
  --pink:#ff4fd8; --cyan:#3dcfff; --grape:#9b5cff;

  /* brutalist motifs */
  --shadow:6px 6px 0 0 var(--ink);
  --shadow-candy:3px 3px 0 0 var(--acid);
  --border:2px solid var(--ink);

  /* motion + layout */
  --ease-out:cubic-bezier(0.23,1,0.32,1);
  --maxw:1120px;
}
```

### Color law (the anti-slop rule)

- State ramp: ONLY the meter, state labels, state dots. Never decorative.
- Candy accents: CTAs, mascot ring, section eyebrows, hover shadows, links. Acid is the
  default; pink / cyan / grape add variety, one accent per context.
- Everything else is base. Color is SIGNAL, never wallpaper.

## Type

- Display: `"Bricolage Grotesque"`, 800. Tracking `-.03em`, line-height `.94`.
- Mono: `"JetBrains Mono"`, 500 / 700. Eyebrows, code, meters, CTAs, trust lines.
- Load via `next/font` (Bricolage 600+800, JetBrains 500+700, latin subset).

Scale (fluid `clamp`):

| Role        | Size                       |
|-------------|----------------------------|
| h1          | `clamp(40px,7.5vw,88px)`   |
| h2          | `clamp(26px,4vw,46px)`     |
| footer-big  | `clamp(28px,5.5vw,56px)`   |
| body / lead | `16-19px` / `16px` `/1.65` |
| eyebrow     | `12px` mono, lowercase, tracking `.08em` |

## Layout, symmetry, spacing

- Container `max-width:var(--maxw)`, centered, padding `0 24px` (`18px` on mobile).
- Section rhythm: `96px` vertical (tight `72px`, mobile `64px`). `border-top:1px solid var(--line)` between sections.
- Symmetric grids: 5 states, 3 how-cards, 3 tiers. Equal columns, equal gaps.
- Spacing scale (px), use ONLY these: `4 8 12 16 18 20 24 28 32 36 48 64 96`.
- Radius: `2-4px`. Sharp. Never rounded-soft.
- Film grain: fixed overlay, `repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)`,
  `opacity:.04`, `mix-blend-mode:overlay`, `pointer-events:none`.

## Components

### Primary CTA (brutalist button)

```css
.btn{font-family:"JetBrains Mono";font-weight:700;background:var(--ink);color:var(--bg);
 border:var(--border);padding:13px 22px;box-shadow:var(--shadow-candy);
 transition:transform 160ms var(--ease-out),box-shadow 160ms var(--ease-out);}
.btn:hover{transform:translate(-2px,-2px);box-shadow:5px 5px 0 0 var(--acid);}
.btn:active{transform:scale(0.97);}
```

### The meter (the product, live)

14 cells. Fill and empty share an identical box model. Toggling `.fill` changes ONLY
`background`, `border-color`, `box-shadow`. Never size. This is what prevents partial-fill
jitter (documented bug + fix).

```css
.meter{display:flex;gap:3px;flex:1 1 auto;min-width:0;--mc:var(--smart);}
.meter .cell{flex:1 1 0;min-width:0;border:1.5px solid #ffffff20;border-radius:2px;
 background:transparent;
 transition:background 220ms var(--ease-out),border-color 220ms var(--ease-out),box-shadow 220ms var(--ease-out);}
.meter .cell.fill{background:var(--mc);border-color:var(--mc);
 box-shadow:0 0 6px -1px var(--mc),inset 0 0 3px #ffffff30;}
```

`filled = round(pct/100 * 14)`. `--mc` = the state color. Behavior: autoplay climb
Smart to Dumb to `/compact` reset; click or Enter spikes to Dumb; reduced-motion shows a
static `Cooked 78%`.

### Mascot badge

```css
.badge{border-radius:50%;border:var(--border);
 box-shadow:0 0 24px -6px var(--acid),var(--shadow-candy);}
```

### Card / tier

Panel background, `1.5-2px` border, sharp radius. Free tier accented: `--smart` border +
bg tint + rotated chip reading `👈 the one you want`.

## Motion spec

- One easing token: `--ease-out` everywhere.
- Hero entrance: stagger via `body[data-mounted]`, `50ms` steps (eyebrow 0, h1 50, sub
  100, meter 150, cta 200, trust 250). Fire after a double `requestAnimationFrame`.
- Press: `scale(0.97)` on `:active` for every interactive element.
- Durations: buttons `160ms`, cells `220ms`, entrance `350ms`, scroll reveal `480ms`.
  All UI under `300ms` except the scroll reveal.
- Scroll reveal: `IntersectionObserver`, threshold `.1`, `translateY(12px)->0` + opacity.
- `prefers-reduced-motion`: kill entrance, climb, reveal, and cell transitions. The meter
  renders the static `Cooked 78%` state.

## Accessibility

- Contrast: body copy on `--bg` at least `4.5:1` (cream `--ink` passes; `--dim` for
  secondary text only).
- `:focus-visible` on every interactive element (2px candy outline).
- Mascot and meter get `aria-label`; decorative cells `aria-hidden`.
- Touch: gate hover effects behind `@media (hover:hover) and (pointer:fine)`.

## Build notes

- Stack: Next.js 15 App Router, TypeScript, plain CSS (variables + CSS Modules),
  `next/font`. No Tailwind, no UI libraries.
- Mascot needs a transparent or dark-matted cut of `logo.png` for `#0a0b0d`.
- All rendered copy comes from the `brand/BRAND.md` copy bank. No em-dashes in any string.
