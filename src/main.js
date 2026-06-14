// Glue. buildLine is pure (text + env -> string). main/readStdin are the only IO.
import { parse } from './parse.js';
import { computeState } from './state.js';
import { render } from './render.js';
import { colorize } from './colorize.js';
import { loadConfig } from './config.js';

export function buildLine(stdinText, env = process.env) {
  const config = loadConfig(env);
  const reading = parse(stdinText);
  const state = computeState(reading.usedPct, config);
  const columns = parseInt(env.COLUMNS, 10) || 80;
  const text = render(reading, state, config, columns);
  return colorize(text, state.severity, config);
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

export async function main() {
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);
  } catch {
    out = ''; // unbreakable: never crash the status line
  }
  process.stdout.write(out);
}
