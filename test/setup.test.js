import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const setupPath = join(here, '..', 'scripts', 'setup.mjs');

// Each test gets its own isolated temp home dir so they don't interfere
function makeTempHome() {
  const dir = join(tmpdir(), 'dumbometer-test-' + randomUUID());
  mkdirSync(join(dir, '.claude'), { recursive: true });
  return dir;
}

function runSetup(tempHome, args = []) {
  return spawnSync('node', [setupPath, ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
  });
}

function settingsPath(tempHome) {
  return join(tempHome, '.claude', 'settings.json');
}

// Test 1: Happy path (install) — existing settings preserved, statusLine injected
test('install: merges into existing settings, preserves existing keys, creates .bak', () => {
  const temp = makeTempHome();
  try {
    const sp = settingsPath(temp);
    writeFileSync(sp, JSON.stringify({ theme: 'dark' }));

    const result = runSetup(temp);
    assert.equal(result.status, 0, `Expected exit 0 but got ${result.status}. stderr: ${result.stderr}`);

    const written = JSON.parse(readFileSync(sp, 'utf8'));
    assert.equal(written.theme, 'dark', 'theme key should be preserved');
    assert.ok(written.statusLine, 'statusLine key should be present');
    assert.equal(written.statusLine.type, 'command', 'statusLine.type should be "command"');
    assert.ok(
      written.statusLine.command.includes('statusline.js'),
      `statusLine.command should include statusline.js; got: ${written.statusLine.command}`,
    );

    const bakPath = sp + '.bak';
    assert.ok(existsSync(bakPath), 'backup file should exist');
    const bak = readFileSync(bakPath, 'utf8');
    assert.deepEqual(JSON.parse(bak), { theme: 'dark' }, 'backup should contain original settings');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

// Test 2: Remove — strips statusLine, preserves other keys
test('remove: strips statusLine key, preserves other keys', () => {
  const temp = makeTempHome();
  try {
    // First install
    const sp = settingsPath(temp);
    writeFileSync(sp, JSON.stringify({ theme: 'dark' }));
    const install = runSetup(temp);
    assert.equal(install.status, 0, 'install should exit 0');

    // Then remove
    const rem = runSetup(temp, ['remove']);
    assert.equal(rem.status, 0, `Expected exit 0 but got ${rem.status}. stderr: ${rem.stderr}`);

    const written = JSON.parse(readFileSync(sp, 'utf8'));
    assert.equal(written.theme, 'dark', 'theme key should still be present after remove');
    assert.ok(!('statusLine' in written), 'statusLine key should be gone after remove');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

// Test 3: No existing settings.json — creates one with statusLine
test('no existing file: creates settings.json with statusLine', () => {
  const temp = makeTempHome();
  try {
    const sp = settingsPath(temp);
    assert.ok(!existsSync(sp), 'settings.json should not exist yet');

    const result = runSetup(temp);
    assert.equal(result.status, 0, `Expected exit 0 but got ${result.status}. stderr: ${result.stderr}`);

    assert.ok(existsSync(sp), 'settings.json should now exist');
    const written = JSON.parse(readFileSync(sp, 'utf8'));
    assert.ok(written.statusLine, 'statusLine key should be present');
    assert.equal(written.statusLine.type, 'command');
    assert.ok(written.statusLine.command.includes('statusline.js'));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

// Test 5: EISDIR — settings.json is a directory → structured abort
test('SAFETY: settings.json is a directory (EISDIR) causes non-zero exit and prints ok:false JSON', () => {
  const temp = makeTempHome();
  try {
    const sp = settingsPath(temp);
    // Make settings.json a DIRECTORY so readFileSync throws EISDIR
    mkdirSync(sp, { recursive: true });

    const result = runSetup(temp);

    assert.notEqual(
      result.status,
      0,
      `Expected non-zero exit but got 0. stdout: ${result.stdout} stderr: ${result.stderr}`,
    );

    // Must print a JSON object with ok:false — no raw stack trace
    let parsed;
    try {
      parsed = JSON.parse(result.stdout.trim());
    } catch {
      assert.fail(`stdout should be valid JSON; got: ${result.stdout}`);
    }
    assert.equal(parsed.ok, false, 'ok should be false');
    assert.ok(typeof parsed.error === 'string' && parsed.error.length > 0, 'error field should be a non-empty string');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

// Test 6: original backup is preserved across repeated runs
test('backup: .bak preserves original settings across repeated runs', () => {
  const temp = makeTempHome();
  try {
    const sp = settingsPath(temp);
    // Write original settings and run setup
    writeFileSync(sp, JSON.stringify({ theme: 'dark' }));
    const first = runSetup(temp);
    assert.equal(first.status, 0, `First run should exit 0; stderr: ${first.stderr}`);

    // Now write DIFFERENT settings and run setup again
    writeFileSync(sp, JSON.stringify({ theme: 'light', extra: true }));
    const second = runSetup(temp);
    assert.equal(second.status, 0, `Second run should exit 0; stderr: ${second.stderr}`);

    // .bak should still contain the ORIGINAL settings (from before the first run)
    const bakPath = sp + '.bak';
    assert.ok(existsSync(bakPath), '.bak should exist');
    const bak = JSON.parse(readFileSync(bakPath, 'utf8'));
    assert.deepEqual(bak, { theme: 'dark' }, '.bak should still contain the original settings, not the second state');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

// Test 4 (SAFETY): unparseable existing settings → abort without writing
test('SAFETY: unparseable existing settings.json (JSONC) causes non-zero exit and leaves file unchanged', () => {
  const temp = makeTempHome();
  try {
    const sp = settingsPath(temp);
    // JSONC with a comment — invalid JSON, not writable to
    const originalContent = '{\n  // a comment\n  "theme": "dark"\n}';
    writeFileSync(sp, originalContent);

    const result = runSetup(temp);

    // Must exit non-zero
    assert.notEqual(
      result.status,
      0,
      `Expected non-zero exit but got 0. stdout: ${result.stdout} stderr: ${result.stderr}`,
    );

    // File must be UNCHANGED — exact same bytes
    const afterContent = readFileSync(sp, 'utf8');
    assert.equal(
      afterContent,
      originalContent,
      'settings.json must not be modified when it is unparseable',
    );

    // No .bak should exist (we aborted before writing)
    const bakPath = sp + '.bak';
    assert.ok(!existsSync(bakPath), 'no .bak should be written when aborting');

    // There should be a clear error message on stdout or stderr
    const combinedOutput = result.stdout + result.stderr;
    assert.ok(
      combinedOutput.includes('not valid JSON') || combinedOutput.includes('aborting') || combinedOutput.includes('abort'),
      `Expected a clear error message about aborting; got: ${combinedOutput}`,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
