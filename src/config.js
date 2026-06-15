// Pure config: defaults + environment overrides.
export const DEFAULTS = {
  width: 10,
  thresholds: { warming: 50, slipping: 70, dumb: 90 },
  labels: { smart: 'Smart', warming: 'Warming', slipping: 'Slipping', dumb: 'Dumb' },
  color: true,
};

export function loadConfig(env = process.env) {
  const cfg = {
    width: DEFAULTS.width,
    thresholds: { ...DEFAULTS.thresholds },
    labels: { ...DEFAULTS.labels },
    color: DEFAULTS.color,
  };

  const w = parseInt(env.DUMBOMETER_WIDTH, 10);
  if (Number.isInteger(w) && w >= 1 && w <= 100) cfg.width = w;

  if (env.DUMBOMETER_THRESHOLDS) {
    const p = env.DUMBOMETER_THRESHOLDS.split(',').map((s) => parseInt(s.trim(), 10));
    if (p.length === 3 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 100)
        && p[0] < p[1] && p[1] < p[2]) {
      cfg.thresholds = { warming: p[0], slipping: p[1], dumb: p[2] };
    }
  }

  if (env.DUMBOMETER_LABELS) {
    const p = env.DUMBOMETER_LABELS.split(',').map((s) => s.trim());
    if (p.length === 4 && p.every((s) => s.length > 0)) {
      cfg.labels = { smart: p[0], warming: p[1], slipping: p[2], dumb: p[3] };
    }
  }

  if (env.NO_COLOR !== undefined || env.DUMBOMETER_NO_COLOR !== undefined) cfg.color = false;

  return cfg;
}
