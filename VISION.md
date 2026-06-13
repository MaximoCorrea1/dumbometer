# dumb-alert — Vision

## The problem

Long Claude Code sessions quietly degrade. As the context window fills, the model
spreads its attention thinner, loses track of earlier details, and starts making
mistakes it wouldn't make fresh — a failure mode the community calls **context rot**.
The insidious part: there's no obvious signal. You don't *feel* the session getting
dumber until it already has, and by then you've wasted turns and trust.

## The insight

You can't measure "accuracy" directly — the model can't report its own IQ. But the
dominant *cause* of degradation **is** measurable: how full the context window is.
So we measure the cause and present it as the effect — a bar that fills from
**Smart → Dumb** as context fills.

## What it is

A Claude Code plugin that renders a tiny, always-visible gauge in the status line:

```
Slipping ████████░░ 79%
```

Glance at it, know whether your session is sharp or fading, decide when to
`/compact` or start fresh. That's the whole product.

## Who it's for

Developers who run long Claude Code sessions and have been burned by silent quality
decay — anyone who's thought "why did it suddenly get worse?" three hours in.

## Principles

1. **Honest.** Measure what's real (context %), framed in plain words. Never fake a
   "smartness" number we can't actually know.
2. **Minimal.** One line. No configuration required. Zero interruptions — you opt in
   by looking.
3. **Zero-cost.** Runs locally on every render. No tokens, no network, no latency
   you'd notice.
4. **Unbreakable.** It runs constantly, so it must never crash, never garble the
   status line, never cost you a keystroke.
5. **Dev-native.** Speaks like a developer. "Smart → Dumb," not "lucidity coefficient."

## Success looks like

- A user installs it in under a minute and never thinks about setup again.
- The gauge is readable in peripheral vision — state legible without focusing on it.
- It never once breaks or clutters the status line.
- Users start `/compact`-ing *before* quality drops, not after.

## Non-goals (v1)

- No notifications, pop-ups, or message injection (pure ambient display).
- No auto-compaction or auto-actions.
- No history or analytics dashboards.
- Not a token-cost tracker (related, but a different product).
