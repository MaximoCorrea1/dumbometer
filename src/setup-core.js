// Pure settings transforms (no IO) so they are unit-testable.
export function statusLineCommand(statuslinePath) {
  // Normalize Windows backslashes to forward slashes — Node accepts them on every
  // platform, and forward slashes render reliably in the status-line shell (verified
  // live), whereas backslashes are shell-dependent.
  const forward = statuslinePath.split(String.fromCharCode(92)).join('/');
  if (forward.indexOf(String.fromCharCode(34)) !== -1) {
    throw new Error('statusline path contains a double-quote; rename the directory to avoid a broken status-line command');
  }
  return `node "${forward}"`;
}

export function applySetup(settings, command) {
  return { ...settings, statusLine: { type: 'command', command } };
}

export function applyRemove(settings) {
  const { statusLine, ...rest } = settings;
  return rest;
}
