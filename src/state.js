// Pure: usedPct + config -> { label, color }.
export function computeState(usedPct, config) {
  const pct = Math.max(0, Math.min(100, usedPct));
  // Pick the LAST level whose min <= pct (highest matching level).
  const { levels } = config;
  let picked = levels[0];
  for (let i = 1; i < levels.length; i++) {
    if (pct >= levels[i].min) picked = levels[i];
  }
  return { label: picked.name, color: picked.color };
}
