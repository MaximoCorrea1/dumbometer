// Pure: wrap text in ANSI color for severity, unless disabled.
const ESC = String.fromCharCode(27); // ANSI escape (0x1B)
const CODES = { red: 31, yellow: 33, green: 32 };

export function colorize(text, severity, config) {
  if (!config.color) return text;
  const code = CODES[severity];
  if (!code) return text;
  return `${ESC}[${code}m${text}${ESC}[0m`;
}
