// Pure settings transforms (no IO) so they are unit-testable.
export function statusLineCommand(statuslinePath) {
  // Normalize Windows backslashes to forward slashes — Node accepts them on every
  // platform, and forward slashes render reliably in the status-line shell (verified
  // live), whereas backslashes are shell-dependent.
  const forward = statuslinePath.split(String.fromCharCode(92)).join('/');
  return `node "${forward}"`;
}

export function applySetup(settings, command) {
  return { ...settings, statusLine: { type: 'command', command } };
}

export function applyRemove(settings) {
  const { statusLine, ...rest } = settings;
  return rest;
}
