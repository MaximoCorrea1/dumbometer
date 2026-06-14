// Pure: build the bar string. No color here (see colorize).
function bar(usedPct, width) {
  const filled = Math.max(0, Math.min(width, Math.round((usedPct / 100) * width)));
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

export function render(reading, state, config, columns = 80) {
  const labelWidth = Math.max(...Object.values(config.labels).map((l) => l.length));

  if (reading.cold) {
    const word = config.labels.smart.padEnd(labelWidth);
    return `${word} ${bar(0, config.width)} …`;
  }

  const pct = Math.round(reading.usedPct);
  const word = state.label.padEnd(labelWidth);
  const full = `${word} ${bar(pct, config.width)} ${pct}%`;
  if (full.length <= columns) return full;

  const noWord = `${bar(pct, config.width)} ${pct}%`;
  if (noWord.length <= columns) return noWord;

  return `${pct}%`;
}
