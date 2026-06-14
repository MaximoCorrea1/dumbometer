// Pure settings transforms (no IO) so they are unit-testable.
export function statusLineCommand(statuslinePath) {
  return `node "${statuslinePath}"`;
}

export function applySetup(settings, command) {
  return { ...settings, statusLine: { type: 'command', command } };
}

export function applyRemove(settings) {
  const { statusLine, ...rest } = settings;
  return rest;
}
