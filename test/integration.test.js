import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (input) => execFileSync('node', [join(root, 'statusline.js')],
  { input, env: { ...process.env, NO_COLOR: '1', COLUMNS: '80' }, encoding: 'utf8' });

test('renders a line from a real-ish payload', () => {
  const out = run(readFileSync(join(root, 'test/fixtures/mid.json'), 'utf8'));
  assert.match(out, /Foggy/);
  assert.match(out, /58%/);
});

test('exits 0 (never crashes) on garbage — execFileSync throws on non-zero exit', () => {
  const out = run('totally not json {{{');
  assert.equal(out, 'Smart    ░░░░░░░░░░ …');
});

// Regression: EPIPE must not crash the status line (exit must be 0, no stack trace on stderr)
test('exits 0 with no stack trace when stdout pipe is closed early (EPIPE)', (_, done) => {
  const child = spawn('node', [join(root, 'statusline.js')], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1', COLUMNS: '80' },
  });

  let stderrOutput = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderrOutput += chunk; });

  // Close the read end immediately to trigger EPIPE when the process tries to write
  child.stdout.destroy();

  // Then send a valid payload and close stdin so the process has something to write
  child.stdin.write('{"context_window":{"used_percentage":58}}');
  child.stdin.end();

  child.on('close', (code) => {
    assert.equal(code, 0, `process exited with code ${code}; stderr: ${stderrOutput}`);
    assert.doesNotMatch(stderrOutput, /EPIPE|Error:|at main/,
      `stderr contained unexpected output: ${stderrOutput}`);
    done();
  });
});
