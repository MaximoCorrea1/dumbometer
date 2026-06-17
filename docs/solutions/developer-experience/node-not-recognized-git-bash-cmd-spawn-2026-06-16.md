---
title: '"node" not recognized when Node tools shell out via cmd.exe on Git Bash (Windows)'
date: 2026-06-16
category: developer-experience
module: dev-environment
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - Running create-next-app / npm run dev / next build / vercel from Git Bash (MSYS) on Windows
  - Node is installed under a path containing a space (e.g. C:\Program Files\nodejs)
  - A Node CLI shells out to "node" via cmd.exe (cross-spawn with shell:true) even though `node -v` works directly
  - Direct node invocation succeeds but a child tool reports node "is not recognized" / "no se reconoce"
symptoms:
  - '`"node" no se reconoce como un comando interno o externo` (or English "is not recognized") from a tool, while `node -v` / `npm -v` work in the same shell'
  - create-next-app, npm run dev, next build, or vercel fail to find node, while running node directly does not
  - Only on Windows + Git Bash. Tools that fork/execFile the node binary work, tools that spawn "node" via a shell fail
tags: [windows, git-bash, msys, nodejs, path, cmd-exe, cross-spawn, nextjs]
---

# "node" not recognized when Node tools shell out via cmd.exe on Git Bash (Windows)

## Context

On Windows, the Claude Code Bash tool runs Git Bash (MSYS), not `cmd.exe`. Node was correctly installed at `C:\Program Files\nodejs\node.exe` (v20.16.0), and `node -v`, `npm -v`, `npx -v` all worked fine in the Git Bash shell. Yet scaffolding and build commands failed:

```
npx create-next-app@latest "<path>" --ts --app ...
# error: ""node"" no se reconoce como un comando interno o externo
# (Spanish Windows: 'node' is not recognized as an internal or external command)
```

The same "node not recognized" failure recurred from `npm run dev` and `next build` when run plainly. The error is misleading: node IS installed and IS on the PATH that Git Bash sees. The problem only surfaces when a Node CLI internally shells out through `cmd.exe`.

The decisive isolation was three one-liners:

```bash
# WORKS: spawns the node binary directly, no shell involved
node -e "console.log(require('child_process').execFileSync(process.execPath,['-v']).toString())"

# FAILS: shell:true routes through cmd.exe (same path cross-spawn/create-next-app take)
node -e "require('child_process').execSync('node -v',{shell:true})"

# FAILS: confirms cmd.exe itself cannot resolve node
cmd /c "node -v"

# but the dir IS on Git Bash's PATH:
which node   # -> /c/Program Files/nodejs/node
```

So: direct-spawn works, shell-spawn fails. That split is the whole diagnosis.

## Guidance

When a Node CLI on Windows/Git Bash dies with "node is not recognized" even though `node -v` works, the nodejs directory is not reaching `cmd.exe` cleanly through the MSYS to Windows PATH conversion. The space in `C:\Program Files\nodejs` breaks the hand-off when a tool spawns `node` via a shell (cross-spawn `shell:true`).

Fix: prefix the command so Git Bash re-prepends the nodejs dir and gives `cmd.exe` a clean Windows PATH entry.

```bash
PATH="/c/Program Files/nodejs:$PATH" npx --yes create-next-app@latest "<path>" --ts --app --no-tailwind
PATH="/c/Program Files/nodejs:$PATH" npm --prefix "<dir>" run build
PATH="/c/Program Files/nodejs:$PATH" npx --yes vercel --prod --yes
```

The short-name (8.3) path also works, since it contains no space:

```bash
PATH="/c/PROGRA~1/nodejs:$PATH" npx --yes create-next-app@latest "<path>" --ts
```

Verify the fix in one shot. With the prefix, the shell-spawn path resolves:

```bash
PATH="/c/Program Files/nodejs:$PATH" node -e "console.log(require('child_process').execSync('node -v',{shell:true}).toString())"
# -> v20.16.0
```

Decision rule: if `node -v` works but a node-spawning CLI reports "node not recognized", do not reinstall Node. Re-prepend the nodejs dir to PATH for that command.

## Why This Matters

This burns time because every signal points the wrong way. The error literally says node is not recognized, so the instinct is to check the install, reinstall Node, or fix the system PATH. All of that is wasted: node is installed and on the PATH Git Bash uses. The break lives in a layer you cannot see, the MSYS to Windows PATH conversion that happens when a child process is spawned through `cmd.exe`.

It is also silent and selective. Tools that fork or `execFileSync` the node binary directly (most of your own scripts, `node --test`) work perfectly, so the machine looks healthy. Only tools that shell out via cross-spawn with `shell:true` (create-next-app, and many `npm run` / `npx` wrappers that re-invoke node) trip it. You can have a green local dev loop and still hit a wall the moment you scaffold or build through one of those tools.

The doubled quotes in `""node""` look like the smoking gun but are a red herring: that is just how cross-spawn quotes the argument when it builds the `cmd.exe` invocation. Chasing the quoting leads nowhere. The real trigger is the space in `Program Files`, proven by the short-name path (`PROGRA~1`) working.

One PATH prefix fixes it without touching the install, system environment variables, or where Node lives.

## When to Apply

Apply when ALL of these hold:

- Platform is Windows and the shell is Git Bash / MSYS (the Claude Code Bash tool on Windows).
- `node -v` / `npm -v` / `npx -v` succeed in the same shell, but a command fails with "node is not recognized as an internal or external command" (or the localized equivalent, e.g. Spanish `"node" no se reconoce como un comando interno o externo`).
- The failing command shells out to node internally: `npx create-next-app`, `npm run <script>`, `next build`, `vercel`, or anything built on cross-spawn `shell:true`.
- `which node` resolves to a path containing a space, typically `/c/Program Files/nodejs/node`.

Confirm the diagnosis before applying: if `node -e "require('child_process').execSync('node -v',{shell:true})"` fails while `cmd /c "node -v"` also fails, you have this exact issue.

Do NOT reach for this when:

- The failing command spawns the node binary directly (fork / `execFileSync` / `node --test`). Those are unaffected, so a failure there is a different problem.
- Node genuinely is not installed or not on PATH (`node -v` itself fails). That is a real install/PATH problem, fix that instead.
- You are in native `cmd.exe` or PowerShell rather than Git Bash. The MSYS conversion is not in play, so this specific cause does not apply.

Generalizes to any Node-spawning CLI on Git Bash whose resolved node path contains a space (custom install dirs with spaces hit the same wall).

## Examples

Reproduce and isolate:

```bash
# Baseline: these all succeed, which is what makes the bug confusing
node -v        # v20.16.0
npm -v
npx -v
which node     # /c/Program Files/nodejs/node   <- note the space

# Direct binary spawn: WORKS
node -e "console.log(require('child_process').execFileSync(process.execPath,['-v']).toString())"

# Shell spawn (cmd.exe under the hood): FAILS with 'node not recognized'
node -e "require('child_process').execSync('node -v',{shell:true})"

# Confirm cmd.exe cannot resolve node on its own: FAILS
cmd /c "node -v"
```

The failing real-world command and its fix:

```bash
# FAILS: ""node"" no se reconoce como un comando interno o externo
npx --yes create-next-app@latest "E:/Projects/my-app" --ts --app --no-tailwind

# FIX: prefix PATH so cmd.exe gets a clean nodejs entry
PATH="/c/Program Files/nodejs:$PATH" npx --yes create-next-app@latest "E:/Projects/my-app" --ts --app --no-tailwind
```

Build and deploy commands need the same prefix:

```bash
PATH="/c/Program Files/nodejs:$PATH" npm --prefix "E:/Projects/my-app" run build
PATH="/c/Program Files/nodejs:$PATH" npx --yes vercel --prod --yes
```

Proof the space is the trigger (short-name path has no space and works):

```bash
PATH="/c/PROGRA~1/nodejs:$PATH" node -e "console.log(require('child_process').execSync('node -v',{shell:true}).toString())"
# -> v20.16.0
```

## Related

- `../documentation-gaps/claude-code-plugin-platform-constraints-2026-06-15.md` (Windows shell portability, same family of gotcha). That doc covers env-var injection syntax differing across shells (`VAR=value cmd` is not portable inside a statusLine string). This doc covers PATH resolution failing in a cmd sub-shell spawned from MSYS. Same family (Windows shell hand-off), different mechanism.
