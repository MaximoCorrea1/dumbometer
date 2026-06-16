---
title: Monetizing an open-source dev tool with a private repo + Polar
date: 2026-06-15
category: best-practices
module: dumbometer-pro
problem_type: best_practice
component: payments
severity: medium
applies_when:
  - Adding a paid tier to a free/OSS Claude Code plugin (or any GitHub-distributed dev tool)
  - You want to charge without building a backend, license server, or auth
tags: [monetization, polar, github, private-repo, claude-code, paid-tier, payments]
---

# Monetizing an open-source dev tool with a private repo + Polar

## Context

Claude Code has no built-in entitlement or license-key mechanism for plugins. A plugin is just a directory of files that Claude Code loads — there is no runtime that can check a license, no server to call, no token to validate. The same constraint applies to any tool distributed via GitHub: if you want to charge for a tier, you cannot gate it at runtime without shipping a backend.

The practical consequence: **the gate must be GitHub repo access itself.** Free tier lives in a public repo anyone can clone. Paid tier lives in a private repo only buyers can access. No backend. No license check. No auth layer.

## Guidance

### 1. Structure: two repos, two tiers

Keep the repos cleanly separated and under separate GitHub identities to avoid accidental exposure:

| Tier | Repo | Visibility | GitHub identity |
|------|------|------------|----------------|
| Free | `MaximoCorrea1/dumbometer` | Public | Personal account |
| Pro | `DumboMeter/dumbometer-pro` | Private | Brand org |

The paid repo contains everything from the free repo plus pro-only features (in this case: theme packs, roast mode, wider bar). It ships its own `.claude-plugin/marketplace.json` so it registers as a distinct plugin (`dumbometer-pro`) rather than replacing the free one.

Why a separate org for the private repo: Polar's GitHub Repository Access benefit grants access when you authorize Polar's GitHub app on the org. Keeping the private repo under `DumboMeter` isolates it cleanly from your personal account and makes the Polar authorization scope narrow and explicit.

### 2. Polar's GitHub Repository Access benefit is the entitlement layer

Polar is a payments platform for open-source / dev-tool creators. Its **GitHub Repository Access** benefit does one specific thing: when a buyer completes a purchase, Polar automatically sends them a GitHub repo invitation. When they accept, they have read access to the private repo. That access is the product.

What Polar handles so you do not have to:

- Checkout (hosted page or embeddable widget)
- Payment processing
- Tax collection (Polar is merchant-of-record — it handles VAT/sales tax globally)
- Automatic GitHub invite on purchase
- Invite revocation if a subscription lapses (for recurring plans; less relevant for one-time)

Setup steps on the Polar side:

1. Create a Polar account and connect your GitHub org (`DumboMeter`).
2. Authorize Polar's GitHub app on the `DumboMeter` org so it can manage invitations to `dumbometer-pro`.
3. Create a product (e.g., "Big Dumb Energy — $9 one-time").
4. Add a **GitHub Repository Access** benefit pointing at `DumboMeter/dumbometer-pro`.
5. Copy the hosted checkout link Polar generates. That link is what goes in the buy button.

### 3. Pricing: one-time, low-friction, "tip jar with perks" framing

For a dev tool where the free version is genuinely complete, a **$9 one-time** purchase works better than a subscription. Reasons:

- Removes the "is this worth $X/month forever?" mental calculation.
- Framed as appreciation + perks rather than a paywall on core functionality.
- Low enough that developers buy without needing approval from anyone.
- One-time means no churn management, no dunning emails, no lapsed-access revocations to handle.

The pro features (theme packs, roast mode) are real additions, not artificial restrictions — which preserves goodwill toward the free tier and the OSS project.

### 4. Static-site checkout — the critical security constraint

If your landing page is a static site (GitHub Pages, Netlify, Vercel static export, any CDN-hosted HTML), you have **no server-side execution**. This creates a hard rule:

**The Polar access token must never appear in static or client-side code.**

The `@polar-sh/nextjs` package provides a `Checkout()` server route that keeps the token server-side — but this only works on a Next.js (or similar SSR) host. On a static host it does not exist and cannot be used.

On a static site, use one of two safe approaches:

**Option A — hosted checkout link (simplest):** Polar generates a direct checkout URL for your product. Wire the buy button as a plain `<a href="...">`. No token, no script, no risk.

```html
<a href="https://buy.polar.sh/polar_cl_XXXXXXXX" class="btn-primary">
  Get Pro — $9
</a>
```

**Option B — Polar embed widget:** Polar provides an embeddable checkout (`@polar-sh/checkout`) that opens in an overlay. Include their embed script, then mark the trigger link with `data-polar-checkout`. The token never touches your HTML.

```html
<!-- once, before </body> -->
<script src="https://cdn.jsdelivr.net/npm/@polar-sh/checkout@latest/dist/embed.global.js"
        defer data-auto-init></script>

<!-- the buy button → opens Polar checkout in an overlay -->
<a href="YOUR_POLAR_CHECKOUT_LINK" data-polar-checkout data-polar-checkout-theme="dark">
  Get Pro — $9
</a>
```

**What NOT to do on a static site:**

```js
// NEVER put your Polar access token in client-side code or static HTML
const polar = new Polar({ accessToken: "polar_at_XXXX..." }); // exposes your account
```

A leaked token gives anyone full API access to your Polar account, including the ability to create products, issue refunds, and access buyer data.

### 5. Buyer install flow

After purchase the buyer receives a GitHub invitation email. Once accepted, the full install flow is:

```
1. Accept GitHub repo invitation (email link)
2. In Claude Code:
   /plugin marketplace add DumboMeter/dumbometer-pro
   /plugin install dumbometer-pro
   /dumbometer-pro:setup
```

The `/dumbometer-pro:setup` slash command writes the `statusLine` entry to `~/.claude/settings.json`, same as the free tier's `/dumbometer:setup`. Because the two plugins have distinct names (`dumbometer` vs `dumbometer-pro`), they can coexist, though only one `statusLine` command is active at a time.

## Why This Matters

- **No backend to run or secure.** The private repo is the product; GitHub's access control is the auth layer. Zero servers means zero ops, zero attack surface, zero monthly fixed cost.
- **Token leakage on a public Pages site is a real, immediate risk.** The Polar access token has broad API permissions. One accidental commit or bundle inclusion hands your Polar account to anyone who views source. The hosted checkout link / embed eliminates this class of error entirely.
- **Polar as merchant-of-record removes tax complexity.** Selling software globally means collecting VAT in the EU, GST in Australia, sales tax in US states. Polar handles all of this; you receive the net amount.
- **The model scales.** Any GitHub-distributed tool — CLI, editor extension, Claude Code plugin — can use the same pattern. The only variation is which platform you use instead of Polar (Gumroad, Lemon Squeezy, and others offer similar GitHub-benefit integrations).

## When to Apply

- You are distributing a dev tool via GitHub and want to add a paid tier without building a backend.
- The free tier is genuinely useful — you are adding perks, not unlocking crippled functionality.
- Your landing page is static (GitHub Pages or equivalent) and you cannot run server-side code.
- You want to avoid global tax registration and payment processing complexity.

## Examples

### The complete buyer flow

```
Buyer clicks "Get Pro — $9" on the landing page
  → Polar hosted checkout (card, etc.)
  → Purchase confirmed
  → Polar sends GitHub repo invitation to buyer's GitHub account
  → Buyer accepts invitation
  → Buyer opens Claude Code:
       /plugin marketplace add DumboMeter/dumbometer-pro
       /plugin install dumbometer-pro
       /dumbometer-pro:setup
  → Status line updates: "Cooked  ██████████████ 79%  · /compact, champ"
```

### The thing you must not do

```js
// index.html or any bundled JS on a static site — DO NOT DO THIS
import { Polar } from "@polar-sh/sdk";
const polar = new Polar({ accessToken: "polar_at_AbCdEfGh..." });
// Anyone who views source now owns your Polar account.
```

The `@polar-sh/nextjs` `Checkout()` server route is the correct way to use the SDK — but it requires a Next.js server (or equivalent SSR runtime). It does not belong on a static host.

### Org and benefit wiring checklist

```
[ ] Private repo created under the brand org (not personal account)
[ ] Polar's GitHub app authorized on that org
[ ] Polar product created with GitHub Repository Access benefit
[ ] Benefit points at <org>/<private-repo> (not the public repo)
[ ] Buy button wired to hosted Polar checkout link or embed — no token in HTML/JS
[ ] .claude-plugin/marketplace.json in the private repo names the plugin correctly
```

## Related

- `../documentation-gaps/claude-code-plugin-platform-constraints-2026-06-15.md`
