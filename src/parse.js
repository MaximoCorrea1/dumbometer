// Pure: raw stdin text -> normalized reading. Never throws.
export function parse(stdinText) {
  const cold = { usedPct: 0, windowSize: null, model: null, cold: true };

  let data;
  try { data = JSON.parse(stdinText); } catch { return cold; }
  if (!data || typeof data !== 'object') return cold;

  // model and windowSize are part of the reading contract, reserved for potential
  // future display (e.g. a richer status line); they are intentionally not consumed
  // by the current renderer.
  const model = (data.model && (data.model.display_name || data.model.id)) || null;
  const cw = data.context_window;
  if (!cw || typeof cw !== 'object') return { ...cold, model };

  const windowSize = typeof cw.context_window_size === 'number' ? cw.context_window_size : null;

  let usedPct = null;
  if (typeof cw.used_percentage === 'number') {
    usedPct = cw.used_percentage;
  } else if (typeof cw.total_input_tokens === 'number' && windowSize) {
    usedPct = (cw.total_input_tokens / windowSize) * 100;
  }

  if (usedPct === null || Number.isNaN(usedPct)) return { ...cold, windowSize, model };

  usedPct = Math.max(0, Math.min(100, usedPct));
  return { usedPct, windowSize, model, cold: false };
}
