---
title: Designing a conversion landing + brand for a viral dev tool
date: 2026-06-15
category: best-practices
module: dumbometer-landing
problem_type: best_practice
component: frontend_stimulus
severity: low
applies_when:
  - Building a one-page landing for a developer tool meant to convert and go viral
  - Naming a dev tool or choosing a voice (humor that still signals "it works")
tags: [landing-page, branding, naming, conversion, design-engineering, dev-tool, css]
---

# Designing a conversion landing + brand for a viral dev tool

## Context

A viral dev tool needs a landing that (a) makes what/how/why obvious in 5 seconds, (b) proves it works, (c) is funny enough to share but credible enough to install. Generic "hero image + feature bullets" landings fail on all three. The dumbometer landing was built as a single zero-dependency `index.html` — no build step, no framework, works opened as a file and on GitHub Pages — and it converts by doing one thing per section and getting out of the way.

## Guidance

### 1. Naming: pick a dev-native metaphor that carries the whole pitch

The hardest naming mistake is naming the mechanism instead of the experience. VISION.md explains the insight directly: "You can't measure 'accuracy' directly — the model can't report its own IQ. But the dominant *cause* of degradation **is** measurable: how full the context window is. So we measure the cause and present it as the effect — a bar that fills from Smart → Dumb as context fills."

That single insight named the product. **dumbometer** — one word, lowercase, dev-native — is the whole pitch compressed. No tagline needed to explain it; the name does the work. The hero headline is a direct consequence: *"Know when your AI gets dumb."* Sentence-case, plain English, no buzzwords.

Rule: name the *effect* the user feels, not the mechanism you measure.

### 2. Proof over screenshot: the hero is the real product

The meterbox in the hero is not an image or a GIF. It is live HTML/CSS/JS — the same meter that runs in your status line — animating in real time above the fold. It autoplays a realistic session (context climbing from low → 100% → reset) with realistic ticker messages. Clicking it spikes to Dumb immediately.

The copy makes the proof explicit: *"↑ click to spike. that's the meter dumbometer adds to your status line."*

This removes the single biggest objection ("does it actually look good?") before the visitor scrolls.

### 3. Craft (Emil-Kowalski-style): one well-orchestrated entrance, restrained everywhere else

**Custom easing variable used throughout:**
```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
}
```
This single variable appears on every transition in the file — buttons, cells, reveals, hero entrance — so every motion feels like the same material.

**Staggered hero entrance via a single `data-mounted` attribute toggle:**
```css
.hero-eyebrow, .hero-h1, .hero-sub,
.hero-meterbox, .hero-cta, .hero-trust {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 350ms var(--ease-out), transform 350ms var(--ease-out);
}

body[data-mounted] .hero-eyebrow { opacity: 1; transform: none; transition-delay: 0ms; }
body[data-mounted] .hero-h1      { opacity: 1; transform: none; transition-delay: 50ms; }
body[data-mounted] .hero-sub     { opacity: 1; transform: none; transition-delay: 100ms; }
body[data-mounted] .hero-meterbox{ opacity: 1; transform: none; transition-delay: 150ms; }
body[data-mounted] .hero-cta     { opacity: 1; transform: none; transition-delay: 200ms; }
body[data-mounted] .hero-trust   { opacity: 1; transform: none; transition-delay: 250ms; }
```

The attribute is set with a double `requestAnimationFrame` so the browser has painted once before the transition fires — no flash of unstyled content:
```js
requestAnimationFrame(function(){
  requestAnimationFrame(function(){
    document.body.setAttribute('data-mounted', '');
  });
});
```

**Button `:active` feedback** on every interactive element:
```css
.btn-primary:active, .btn-ghost:active,
.copybtn:active, .navlink:active { transform: scale(0.97); }
```

**`prefers-reduced-motion` kills all animation** without breaking layout:
```css
@media (prefers-reduced-motion: reduce) {
  .hero-eyebrow, .hero-h1, .hero-sub,
  .hero-meterbox, .hero-cta, .hero-trust {
    opacity: 1; transform: none; transition: none;
  }
  .reveal { opacity: 1; transform: none; transition: none; }
  .meter .cell { transition: none; }
}
```
In reduced-motion mode the hero meter also skips the autoplaying loop and sets a static "Cooked 78%" state with a label.

The discipline: one entrance animation, one easing variable, one scroll-reveal pattern. Nothing else moves unless the user interacts.

### 4. Reduce AI slop → keep signal

The difference between a forgettable landing and a shareable one is information density. Common slop patterns and how they were avoided:

| Slop pattern | What the landing does instead |
|---|---|
| Generic hero headline ("The future of AI context management") | Direct effect statement: "Know when your AI gets dumb." |
| Feature list before proof | Live meter demo before any feature list |
| Long sub-headline paragraph | One sentence: what it is, what it does, the one action to take |
| Trust signals buried in footer | Trust line immediately below CTA: `free · MIT · zero tokens · 64 tests · never crashes` |
| "Powerful", "seamless", "next-gen" | "reads your real context-window %" — concrete, verifiable |

The section structure is ruthlessly sequential: **problem → what it looks like → five states → how it works → install → pricing**. Each section has a small mono eyebrow (like `// a real session`) and a plain h2. No section tries to do two things.

### 5. Humor that hides real value: satirical pricing where every joke names a real feature

The pricing headline: *"Three tiers. Pick the free one."* The lead: *"The product is free and that's the honest answer. The other two exist because we couldn't help ourselves."*

- **Free tier** — highlighted with a rotated badge reading `👈 the one you want`. Every bullet is a real, verifiable feature claim.
- **$9 "Big Dumb Energy" (one-time)** — a tip jar with real perks (color themes, Roast Mode, a `dumb --score` flag, custom labels). The funny names each describe a real capability. Funny gets the share; the real benefit justifies the $9.
- **$1M "Singularity" (joke)** — *"We fly to your home office. We physically tap your shoulder when the context fills. Weighted blanket included."* CTA is a `mailto:`. Footer: `we will not be doing this. please buy the free one.`

The pattern: joke tiers work only when the free tier is completely unambiguous and the joke's humor comes from *exaggerating a real feature* (physical notification = the meter, but in person), not from randomness.

### 6. Zero-dependency, single-file discipline

The entire landing is one `index.html`. No build step, no bundler, no framework, no CDN for logic — fonts are the only external load. The JavaScript is a single IIFE using `var`, no classes, no modules. It works opened directly in a browser (`file://`), works on GitHub Pages with zero configuration, and has no dependency-rot surface. The same discipline that governs the plugin (`node` is the only assumed binary) governs the landing.

## Why This Matters

Proof-as-hero + dev-native naming + restrained craft is what separates a shareable landing from a forgettable template:

- **Proof-as-hero** removes the primary objection before it forms. Screenshots can be faked; a live, interactive demo running in the page cannot.
- **Dev-native naming** compresses the pitch to one word. Visitors who get the name already understand the product.
- **Restrained craft** — one easing variable, one entrance, clean motion, `prefers-reduced-motion` respected — signals the author cares about details. For a tool that runs constantly in a developer's status line, "the author cares about details" is itself a trust signal.

## When to Apply

- You are building a one-page landing for a developer tool with no marketing budget, relying on organic sharing.
- Your tool does one concrete thing that has a funny or memorable name hiding a real problem.
- You want the landing to function as install documentation as well as a conversion page.
- You need the page to work without a build pipeline (GitHub Pages, direct file open).
- You are choosing between a polished screenshot and a live demo — always choose the live demo if the product is UI.

## Examples

**The segmented meter CSS (the `.cell` / `.cell.fill` box model):**
```css
.meter { display: flex; gap: 3px; flex: 1 1 auto; min-width: 0; --mc: var(--smart); }
.meter .cell {
  flex: 1 1 0;
  min-width: 0;
  border: 1.5px solid #ffffff20;
  background: transparent;
  border-radius: 2px;
  transition: background 220ms var(--ease-out),
              border-color 220ms var(--ease-out),
              box-shadow 220ms var(--ease-out);
}
.meter .cell.fill {
  background: var(--mc);
  border-color: var(--mc);
  box-shadow: 0 0 6px -1px var(--mc), inset 0 0 3px #ffffff30;
}
```
Both `.cell` and `.cell.fill` use `flex: 1 1 0` and `min-width: 0` — identical box model. The fill state only changes `background`, `border-color`, and `box-shadow`; it never changes size or layout.

**Before/after: slop → signal (hero sub-headline):**

Before (AI slop voice):
> "dumbometer is a powerful, seamless context monitoring solution for Claude Code users who want to stay informed about their AI's cognitive capacity in real time."

After (the actual landing):
> "A live meter in your Claude Code status line that shows how full your context window is — so you `/compact` before your agent forgets your code."

One sentence. Subject → what it does → why you care → the one action. No adjectives that don't describe a measurable property.

## Note — the visual bug we hit and fixed

During development, partially-filled meters looked broken: the filled segments appeared a different width than the empty track segments, making the bar look misaligned at intermediate fill levels.

Root cause: a box-model mismatch between the filled and empty cell states. The fix was to make both states use an exactly identical box model — `flex: 1 1 0; min-width: 0; border: 1.5px solid …` — and change only non-layout properties (`background`, `border-color`, `box-shadow`) when toggling `.fill`. The current CSS reflects this: neither `.cell` nor `.cell.fill` touches `width`, `padding`, or `flex-basis` independently.

Lesson: in a flex-row segmented component, filled and empty cells must be structurally identical. Any property that affects layout (width, padding, inconsistent border-box handling) will cause visible jitter at partial fill.

## Related

- `../best-practices/monetize-oss-plugin-private-repo-polar-2026-06-15.md`
