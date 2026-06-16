# Dumbometer Brand

Brutalist-candy. The brand of a dev tool that is funny about a real problem.
One rule above all the others: every choice is SIGNAL. No slop, no bloat.

See `brand/DESIGN.md` for the visual system (tokens, type, motion, components).
These two files are the brand source for the `DumboMeter/site` build.

## The one-liner

Know when your AI gets dumb. A live context meter in your Claude Code status line.

## Mascot

The derpy gauge-face: a rainbow Smart-to-Dumb tick-arc over two googly eyes with a
tongue sticking out. It looks a little dumb on purpose. That is the joke and the logo
at the same time. The arc IS the meter. The face IS "dumb." The product is in the mark.

- Primary use: circular badge (CSS `border-radius:50%`) with a candy neon ring glow.
  Hero anchor, nav mark, favicon, OG image.
- Asset: `logo.png` (white background). Needs a transparent or dark-matted cut to sit
  on `#0a0b0d`. Build task, tracked.
- Optional easter egg (ship later, not v1): eyes react by state, calm at Smart, `x_x`
  at Dumb.

Do not: redraw it "cleaner," remove the tongue, set it on a busy background, or add a
second character. One mascot, derpy, candy.

## Voice

Dev-native. Funny, but serious, because it is a tool people run all day.

- Short. Concrete. Examples over adjectives.
- Humor always names a real feature. Never random.
- Serious wherever it is a claim: reads your real %, never crashes, 64 tests, zero tokens.
- NO em-dashes. NO fluff words (powerful, seamless, next-gen, effortless, revolutionize).
  NO walls of text.
- Lowercase mono eyebrows: `// a real session`.
- Motifs: skull for Dumb, `/compact` as the recurring verb, the self-aware meter.

### Voice test (run on every line before it ships)

1. Would a developer screenshot this? (catchy)
2. Does it say something true and specific? (signal)
3. Could you delete half the words? (no bloat)

If a line fails 2, cut the claim. If it fails 3, cut the words.

### Copy bank (approved, reuse verbatim)

- Hero H1: `Know when your AI gets dumb.`
- Hero sub: `A live meter in your Claude Code status line that shows how full your context window is, so you /compact before your agent forgets your code.`
- Problem: `Context rot is real.`
- Trust line: `free · MIT · zero tokens · 64 tests · never crashes`
- Session beats: `fresh context. agent is sharp.` / `still solid. keep going.` /
  `starting to drift. plan your /compact.` / `re-inventing APIs. /compact now.`
- Footer: `Stop shipping dumb-session code.`
- Self-aware: `made while watching this exact meter climb to 99%.`

## The humor system (pricing)

Three tiers. The free one is the real answer. The jokes sell by exaggerating a real
feature, never by being random.

- Free, "the one you want": the whole product. Every bullet is a true claim.
- $9 Big Dumb Energy (one-time, tip jar with perks): color themes, Roast Mode, custom
  labels, `dumb --score`. Funny names, real features.
- $1M Singularity (joke): "we physically tap your shoulder when the context fills."
  `mailto:` CTA. Footer: `we will not be doing this. please buy the free one.`

Rule: the joke only works because the free tier is unambiguous and the humor is an
exaggerated real feature.

## Monetization (how the brand makes money)

GitHub repo access is the entitlement. No backend, no license check.

- Free: public repo `MaximoCorrea1/dumbometer`, MIT, the complete product.
- Pro: private repo `DumboMeter/dumbometer-pro`. The $9 buys repo access via Polar
  (GitHub Repository Access benefit), which auto-invites the buyer on purchase.
- The site wires checkout with `@polar-sh/nextjs` `Checkout()` as a server route so the
  Polar token stays server-side (Vercel env var, never committed).

## Anti-slop checklist (the brand says no to)

- No purple-on-white gradients, no generic hero stock, no Inter / Roboto / Arial.
- No adjective stacks, no three-paragraph intros.
- No rainbow surfaces. Candy is an accent, not a wallpaper.
- No em-dashes anywhere.
