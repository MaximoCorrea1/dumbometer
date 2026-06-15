// Pure: wrap text in 256-color ANSI SGR, unless disabled or color is null.
const ESC = String.fromCharCode(27); // ANSI escape (0x1B)

export function colorize(text, color, config) {
  if (!config.color) return text;
  if (color == null) return text;
  return `${ESC}[38;5;${color}m${text}${ESC}[0m`;
}
