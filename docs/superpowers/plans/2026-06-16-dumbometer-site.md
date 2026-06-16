# dumbometer site (v5) Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development (sections are independent) or executing-plans. Steps use checkbox (`- [ ]`) syntax.

## Start here (next session)

You are picking up a redesign mid-stream. dumbometer is a shipped Claude Code plugin (free: `MaximoCorrea1/dumbometer`, public + live; pro: `DumboMeter/dumbometer-pro`, private, 100 tests). This plan builds the NEW marketing site; the old static `index.html` is being replaced.

1. Optional: activate routing with `/flowy:superpowers-flow`.
2. Build the tasks below (subagent-driven-development; the sections are independent).
3. Assets are in this repo: `logo.png` + `icon.ico` (root), `brand/`, `example screenshots/` (2 real renders: Coasting 35% "ship the rate limiter", Foggy 54% "build gta vi").
4. The user provides at deploy time: the domain (DNS to Vercel), `POLAR_ACCESS_TOKEN` + `POLAR_SUCCESS_URL` (Vercel env vars, never commit), and any more screenshots.
5. Polar product id: `843fdc28-55e3-43d5-9924-2af444e412f4`.

Design law: brutalist-candy. Canonical brand + design system: `brand/BRAND.md` + `brand/DESIGN.md` (read these first; they win on any conflict). Mascot-led, examples everywhere, no em-dashes.

**Goal:** Ship the redesigned dumbometer marketing site: a dark, brutalist-candy, mascot-led, example-heavy Next.js landing on Vercel at a custom domain, with a working $9 Polar checkout.

**Architecture:** Next.js (App Router, TypeScript) marketing site, mostly static, plus ONE server route for Polar checkout (keeps the access token server-side). Deployed on Vercel from new repo `DumboMeter/site`. Custom domain (user buys it).

**Stack:** Next.js 15 (App Router), React, TypeScript, plain CSS (CSS variables + CSS Modules, no Tailwind), `next/font`, `@polar-sh/nextjs` for checkout. No heavy UI libs.

**Design law (non-negotiable, canonical in `brand/DESIGN.md`):** brutalist-candy. Dark base `#0a0b0d`; hard offset shadows (`6px 6px 0`) + sharp 2px borders + film grain; candy-neon accents (`--acid` signature, plus pink/cyan/grape) layered on the reserved Smart->Dumb state ramp; bold Bricolage Grotesque + JetBrains Mono; symmetric, generously spaced, high contrast. The state ramp is for the meter and state semantics ONLY; candy is accent, never wallpaper (color = SIGNAL). ONE orchestrated entrance, restrained motion, `prefers-reduced-motion` respected. NO em-dashes in any copy. Examples everywhere. The derpy gauge-face mascot is the brand.

## Assets
- `brand/` and `example screenshots/` in the current repo. Copy into the new site's `public/`.
- `logo.png` mascot (gauge-arc face) -> rendered as a circular badge (CSS `border-radius:50%`); hero + nav.
- `icon.ico` -> favicon.
- Screenshots (real renders): `Coasting 35%` ("ship the rate limiter", green), `Foggy 54%` ("build gta vi", yellow). Used in the example sections. More to come.

## Design tokens (`app/globals.css`)

Canonical source: **`brand/DESIGN.md`** (this refines the earlier draft; on any conflict, `brand/DESIGN.md` wins). Copy verbatim:
```css
:root{
  /* base */
  --bg:#0a0b0d; --panel:#101216; --ink:#f3f1e9; --dim:#9a9c96; --line:#ffffff14;
  /* state ramp -> meter + state semantics ONLY */
  --smart:#5dff57; --coasting:#9be34a; --foggy:#ffd23f; --cooked:#ff7a1e; --dumb:#ff2e2e;
  /* candy accents -> CTAs, mascot ring, eyebrows, hovers, links */
  --acid:#c6ff3a; --pink:#ff4fd8; --cyan:#3dcfff; --grape:#9b5cff;
  /* brutalist motifs */
  --shadow:6px 6px 0 0 var(--ink); --shadow-candy:3px 3px 0 0 var(--acid); --border:2px solid var(--ink);
  /* motion + layout */
  --ease-out:cubic-bezier(0.23,1,0.32,1); --maxw:1120px;
}
/* glow util: box-shadow:0 0 24px -6px <candy>. film grain: fixed overlay, repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px), opacity .04, mix-blend overlay */
```
Fonts via `next/font`: Bricolage Grotesque (display, 600+800) + JetBrains Mono (500+700) for renders/mono.

## File structure
```
app/layout.tsx          # fonts, metadata, favicon, <body> shell
app/page.tsx            # composes the sections
app/globals.css         # tokens + reset + glow utils
app/api/checkout/route.ts  # Polar checkout (server)
app/success/page.tsx    # post-purchase install instructions
components/Meter.tsx     # live animated candy-neon meter
components/sections/*    # Hero, WhatItDoes, States, HowWhy, Session, Install, Pricing, Footer
public/                 # logo, icon, screenshots, og image
```

## Tasks

### Task 1: Repo + scaffold
- [ ] Create `DumboMeter/site` (gh repo create, private first).
- [ ] `create-next-app` (App Router, TS, no Tailwind). Add `next/font`, base `layout.tsx` (metadata: title, description, favicon from icon.ico, OG), commit + push.

### Task 2: Brutalist-candy design system
- [ ] `globals.css` with the canonical tokens above + reset + `.glow` + `--shadow`/`--border` brutalist utilities + film-grain overlay + section rhythm (symmetric max-width container, generous vertical spacing; spacing scale per `brand/DESIGN.md`).
- [ ] Brutalist button + card patterns per `brand/DESIGN.md` (hard offset shadow, hover shadow-nudge `translate(-2,-2)`, `:active` `scale(0.97)`).
- [ ] Circular mascot badge component (logo via `border-radius:50%`, candy neon ring glow). Mascot asset note: `logo.png` has a white background, so the badge reads as a white "sticker" disc on the dark page (on-brand for brutalist-candy). If a background-less mascot is wanted instead, produce a transparent/dark-matted cut at build time (no ImageMagick/Pillow on the machine, so do it via an in-browser canvas export or a transparent re-export).

### Task 3: Live meter component (`components/Meter.tsx`)
- [ ] Port the segmented animated meter from the current `index.html` to React: 14 cells, state-ramp fills (`--smart`..`--dumb`, never candy accents) + glow, identical fill/empty box model (no partial-fill jitter), autoplay climb (Smart -> Dumb -> reset) + click-to-spike, reduced-motion static state. Props for label/pct/theme.

### Task 4: Hero
- [ ] Mascot badge + chunky candy wordmark "dumbometer". H1: "Know when your AI gets dumb." One-sentence subhead (what it is + the one action). `<Meter/>` centerpiece (glowing). Copyable install one-liner. "Get it free →" candy-pink CTA. Trust line: `free · MIT · zero tokens · never crashes`. Staggered entrance via a mounted flag.

### Task 5: What it does (real screenshot)
- [ ] Section: the `Foggy 54%` screenshot, annotated. Plain copy: "It reads your real context-window % and shows Smart to Dumb, right in your status line."

### Task 6: The 5 states
- [ ] Five candy gauges in a symmetric grid. Each: state name, % range, one-line meaning, a mini render. (Smart 0-24, Coasting 25-49, Foggy 50-69, Cooked 70-89, Dumb 90-100.)

### Task 7: How and why (3 cards)
- [ ] Measures the cause (context %). Shows the effect (Smart to Dumb). Costs zero tokens, runs locally, never crashes.

### Task 8: A real session
- [ ] The climbing strip (context 4% -> 100% -> `/compact` reset) with live renders + ticker, plus the two real screenshots as inline examples.

### Task 9: Install
- [ ] The 3 commands big + copyable (`/plugin marketplace add MaximoCorrea1/dumbometer`, `/plugin install dumbometer`, `/dumbometer:setup`). Candy badges.

### Task 10: Pricing + Polar checkout
- [ ] Three candy cards: Free (highlighted, "the one you want"); $9 "Big Dumb Energy" (real perks: themes, Roast Mode, custom labels); $1M joke tier (mailto).
- [ ] `app/api/checkout/route.ts`:
```ts
import { Checkout } from "@polar-sh/nextjs";
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  successUrl: process.env.POLAR_SUCCESS_URL!, // https://<domain>/success?checkout_id={CHECKOUT_ID}
});
```
- [ ] $9 button -> `/api/checkout?products=843fdc28-55e3-43d5-9924-2af444e412f4`. `POLAR_ACCESS_TOKEN` set in Vercel env only (never committed).
- [ ] `app/success/page.tsx`: "You're in." + pro install steps (`/plugin marketplace add DumboMeter/dumbometer-pro` -> `/plugin install dumbometer-pro` -> `/dumbometer-pro:setup`).

### Task 11: Footer + SEO
- [ ] Footer (MIT, GitHub, "post your dumb score 💀"). OG image (candy-neon + mascot + meter), meta tags, sitemap/robots.

### Task 12: Responsive + a11y + reduced-motion
- [ ] Mobile layout (stack, keep symmetry), focus-visible states, contrast check on body copy, `prefers-reduced-motion` disables the climb + entrance.

### Task 13: Deploy
- [ ] Push, connect Vercel to `DumboMeter/site`, set `POLAR_ACCESS_TOKEN` + `POLAR_SUCCESS_URL` env, add the custom domain (user buys it; I configure DNS/Vercel).

## Copy guidelines
- No em-dashes. Short, concrete, dev-native. Examples over adjectives. Humor that names a real feature (the satirical tiers each hide a real perk).
