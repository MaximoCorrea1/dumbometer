---
description: Install or remove the dumbometer context gauge in your Claude Code status line
---

# dumbometer: setup

Wire the dumbometer gauge into the user's Claude Code status line.

1. Run the bundled setup script with the Bash tool from the plugin directory:
   - Install: `node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs"`
   - Remove (only if the user asked to uninstall): `node "${CLAUDE_PLUGIN_ROOT}/scripts/setup.mjs" remove`
   If `${CLAUDE_PLUGIN_ROOT}` is not set in your shell, locate this plugin's `scripts/setup.mjs` and run it with `node`.
2. The script writes `~/.claude/settings.json` (backing up the old one to `settings.json.bak`) and prints a JSON result. Report to the user the settings path and what changed.
3. Tell the user to send one more message so Claude Code re-renders the status line; they should see e.g. `Smart ██░░░░░░░░ 20%`. To revert, run `/dumbometer:setup` and ask to remove, or restore `settings.json.bak`.
