# Dumbometer

A Claude Code status-line gauge showing Smart→Dumb as the context window fills.

```
Cooked   ███████████░░░ 79%
```

## What it shows

The gauge maps context-window usage to five states with a 256-color gradient:

| % used | Label    | Color       |
|--------|----------|-------------|
| 0–24   | Smart    | bright green |
| 25–49  | Coasting | green       |
| 50–69  | Foggy    | yellow      |
| 70–89  | Cooked   | orange      |
| 90–100 | Dumb     | red         |

Display-only — no interruptions, no popups. Zero token cost (the status-line command
is not counted as context).

## Install

**Marketplace (published):**

```
/plugin marketplace add MaximoCorrea1/dumbometer
/plugin install dumbometer
/dumbometer:setup
```

**Local dev:**

```bash
claude --plugin-dir .
```

Then run `/dumbometer:setup` inside Claude Code. The command locates
`~/.claude/settings.json`, backs it up to `settings.json.bak`, and inserts the
status-line entry. Send one more message and the gauge appears.

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

## Uninstall

Run `/dumbometer:setup` and ask to remove, or restore the backup manually:

```bash
cp ~/.claude/settings.json.bak ~/.claude/settings.json
```

## Notes

Zero dependencies. Requires Node.js, which ships with Claude Code.
