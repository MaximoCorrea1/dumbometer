# Dumbometer

Dumbometer is a Claude Code status-line gauge that shows how full your context window is, so you `/compact` before quality drops.

```
Cooked   ███████████░░░ 79%
```

Long sessions degrade silently as the context window fills (the community calls this **context rot**): the model spreads its attention thinner, forgets earlier details, and starts making mistakes it wouldn't make fresh. There's no built-in signal. Dumbometer is that signal: one always-visible word + bar that fills from **Smart → Dumb**. Glance at it, decide when to compact or start fresh.

## What it shows

Context-window usage mapped to five states with a 256-color gradient (bright green to red):

| % used | Label    | Color        |
|--------|----------|--------------|
| 0–24   | Smart    | bright green |
| 25–49  | Coasting | green        |
| 50–69  | Foggy    | yellow       |
| 70–89  | Cooked   | orange       |
| 90–100 | Dumb     | red          |

Display-only. No popups, no interruptions, no message injection. You opt in by looking.

The bar is 14 cells wide (`█` filled, `░` empty). The word is padded to a stable width, so the bar never jitters sideways as the label changes. In a narrow terminal it degrades gracefully: shrink the bar, drop the word, drop the bar, down to just `79%`.

## Install

**Marketplace (published):**

```
/plugin marketplace add MaximoCorrea1/dumbometer
/plugin install dumbometer
/dumbometer:setup
```

`/dumbometer:setup` locates `~/.claude/settings.json`, backs it up to `settings.json.bak`, and inserts the status-line entry. Send one more message and the gauge appears.

**Local dev:**

```bash
claude --plugin-dir .
```

Then run `/dumbometer:setup` inside Claude Code.

## Manual setup (alternative)

Add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"/absolute/path/to/statusline.js\""
  }
}
```

## Configuration

Zero-config by default. Override with environment variables (set inside the
`command` string or in your shell):

| Variable | Effect | Default |
|---|---|---|
| `DUMBOMETER_WIDTH` | Bar width in cells | `14` |
| `DUMBOMETER_THRESHOLDS` | 4 ascending ints (1–99): start % for Coasting,Foggy,Cooked,Dumb | `25,50,70,90` |
| `DUMBOMETER_LABELS` | 5 comma-separated label words | `Smart,Coasting,Foggy,Cooked,Dumb` |
| `DUMBOMETER_NO_COLOR` / `NO_COLOR` | Disable ANSI color | unset |

## FAQ

**What is context rot?**
Quality decay as a model's context window fills up. The more tokens in context, the thinner the model spreads its attention, so it loses track of earlier details and makes mistakes it wouldn't make in a fresh session. Dumbometer measures how full the window is, which is the main cause you can actually see.

**Does dumbometer cost tokens?**
No. The status-line command runs locally on your machine and its output is not counted as context. Zero tokens, zero network calls.

**How does it know my context is full?**
Claude Code pipes a JSON event to the status line on every render. Dumbometer reads `context_window.used_percentage` from it (verified against a live payload), or computes it from used tokens over window size. No guessing.

**Will it slow down or break Claude Code?**
No. It's one synchronous Node script with zero dependencies and no file IO on the hot path, so work after Node startup is sub-millisecond. Every error path prints safe output and exits 0, so the status line never crashes or garbles. 64 tests cover it.

**Does it work with the 1M context window?**
Yes. It reads the actual window size from the payload, so 200K and 1M sessions both show a correct percentage. A real 1M-window Opus payload is locked in as a regression fixture.

**Why a word instead of just a number?**
"Cooked" reads in peripheral vision; "79%" makes you do math. The morphing word (Smart → Dumb) tells you the state at a glance, and Dumb is unambiguously the bad end. The number is there too if you want it.

## Uninstall

Run `/dumbometer:setup remove` to restore the backup, or do it manually:

```bash
cp ~/.claude/settings.json.bak ~/.claude/settings.json
```

## Notes

Zero dependencies, zero token cost, 64 tests, never crashes. Runs locally. Requires
Node.js, which ships with Claude Code.
