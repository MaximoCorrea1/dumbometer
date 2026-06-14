// Pure: usedPct + config -> { label, severity }.
export function computeState(usedPct, config) {
  const { thresholds, labels } = config;
  const pct = Math.max(0, Math.min(100, usedPct));
  if (pct >= thresholds.dumb) return { label: labels.dumb, severity: 'red' };
  if (pct >= thresholds.slipping) return { label: labels.slipping, severity: 'yellow' };
  if (pct >= thresholds.warming) return { label: labels.warming, severity: 'green' };
  return { label: labels.smart, severity: 'green' };
}
