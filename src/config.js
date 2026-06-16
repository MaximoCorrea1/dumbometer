// Pure config: defaults + environment overrides.
export const DEFAULTS = {
  width: 14,
  color: true,
  levels: [
    { name: 'Smart',    min: 0,  color: 46  },
    { name: 'Coasting', min: 25, color: 118 },
    { name: 'Foggy',    min: 50, color: 226 },
    { name: 'Cooked',   min: 70, color: 208 },
    { name: 'Dumb',     min: 90, color: 196 },
  ],
};

export function loadConfig(env = process.env) {
  const cfg = {
    width: DEFAULTS.width,
    color: DEFAULTS.color,
    levels: DEFAULTS.levels.map((l) => ({ ...l })),
  };

  const w = parseInt(env.DUMBOMETER_WIDTH, 10);
  if (Number.isInteger(w) && w >= 1 && w <= 100) cfg.width = w;

  if (env.DUMBOMETER_THRESHOLDS) {
    const p = env.DUMBOMETER_THRESHOLDS.split(',').map((s) => parseInt(s.trim(), 10));
    // Exactly 4 ints, each 1–99, strictly ascending
    if (
      p.length === 4 &&
      p.every((n) => Number.isInteger(n) && n >= 1 && n <= 99) &&
      p[0] < p[1] && p[1] < p[2] && p[2] < p[3]
    ) {
      // p[0..3] become min of levels 2–5; level 1 min stays 0
      cfg.levels[1].min = p[0];
      cfg.levels[2].min = p[1];
      cfg.levels[3].min = p[2];
      cfg.levels[4].min = p[3];
    }
  }

  if (env.DUMBOMETER_LABELS) {
    const p = env.DUMBOMETER_LABELS.split(',').map((s) => s.trim());
    // Exactly 5 non-empty names
    if (p.length === 5 && p.every((s) => s.length > 0)) {
      cfg.levels.forEach((lvl, i) => { lvl.name = p[i]; });
    }
  }

  if (env.NO_COLOR !== undefined || env.DUMBOMETER_NO_COLOR !== undefined) cfg.color = false;

  return cfg;
}
