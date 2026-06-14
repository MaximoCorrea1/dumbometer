#!/usr/bin/env node
// tools/capture.js — DEV ONLY. Temporarily wire this as your statusLine command
// to capture a real payload into test/fixtures/captured-latest.json, then inspect it.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => { data += c; });
process.stdin.on('error', () => { process.stdout.write('capturing…'); });
process.stdin.on('end', () => {
  try {
    const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'fixtures');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'captured-latest.json'), data);
  } catch { /* ignore */ }
  process.stdout.write('capturing…');
});
