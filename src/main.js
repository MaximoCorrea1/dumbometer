// Glue. buildLine is pure (text + env -> string). main/readStdin are the only IO.
import { parse } from './parse.js';
import { computeState } from './state.js';
import { render } from './render.js';
import { colorize } from './colorize.js';
import { loadConfig } from './config.js';

export function buildLine(stdinText, env = process.env) {
  const config = loadConfig(env);
  const reading = parse(stdinText);
  const usedPct = Math.round(reading.usedPct);
  const state = computeState(usedPct, config);
  const parsedCols = parseInt(env.COLUMNS, 10);
  const columns = Number.isInteger(parsedCols) && parsedCols > 0 ? parsedCols : 80;
  const text = render({ ...reading, usedPct }, state, config, columns);
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
  process.stdout.on('error', () => {}); // EPIPE: reader closed the pipe → swallow, never crash
  let out = '';
  try {
    out = buildLine(await readStdin(), process.env);
  } catch {
    out = '';
  }
  try {
    process.stdout.write(out);
  } catch {
    /* never crash the status line */
  }
}
