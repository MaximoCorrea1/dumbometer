# dumb-alert

A Claude Code status-line gauge showing Smart→Dumb as the context window fills.

```
Slipping ████████░░ 79%
```

## What it shows

The gauge maps context-window usage to four states:

| % used | Label    | Color  |
|--------|----------|--------|
| 0–49   | Smart    | green  |
| 50–69  | Warming  | green  |
| 70–89  | Slipping | yellow |
| 90–100 | Dumb     | red    |

Display-only — no interruptions, no popups. Zero token cost (the status-line command
is not counted as context).

## Install

**Marketplace (published):**

```
/plugin marketplace add <repo>
/plugin install dumb-alert
/dumb-alert:setup
```

**Local dev:**

```bash
claude --plugin-dir .
```

Then run `/dumb-alert:setup` inside Claude Code. The command locates
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
| `DUMB_ALERT_WIDTH` | Bar width in cells | `10` |
| `DUMB_ALERT_THRESHOLDS` | Comma-separated Warming,Slipping,Dumb start % | `50,70,90` |
| `DUMB_ALERT_LABELS` | Comma-separated label words | `Smart,Warming,Slipping,Dumb` |
| `DUMB_ALERT_NO_COLOR` / `NO_COLOR` | Disable ANSI color | unset |

## Uninstall

Run `/dumb-alert:setup` and ask to remove, or restore the backup manually:

```bash
cp ~/.claude/settings.json.bak ~/.claude/settings.json
```

## Notes

Zero dependencies. Requires Node.js, which ships with Claude Code.
