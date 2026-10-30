import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {mergePreferences, defaultPreferences} from '../src/lib/preferences-model.js';

test('preference updates keep theme, density, and agent color together', () => {
  const next = mergePreferences(defaultPreferences(), {theme: {color: '#336699', preset: 'custom', backgrounds: false}, chatDensity: 'compact', agents: {scout: {color: '#abcdef', icon: ''}, '../nope': {color: '#000000'}}});
  assert.equal(next.theme.color, '#336699');
  assert.equal(next.theme.preset, 'custom');
  assert.equal(next.theme.backgrounds, false);
  assert.equal(next.theme.mode, 'dark');
  assert.equal(next.chatDensity, 'compact');
  assert.deepEqual(next.agents.scout, {color: '#abcdef', icon: ''});
  assert.equal(next.agents['../nope'], undefined);
});

test('two browsers receive the same theme and agent color', {timeout: 20000}, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'omp-live-'));
  const port = 46000 + Math.floor(Math.random() * 10000);
  const base = 'http://127.0.0.1:' + port;
  const child = spawn(process.execPath, ['server.mjs'], {env: {...process.env, PORT: String(port), OMP_WEB_DATA_DIR: join(dir, 'app')}, stdio: ['ignore', 'pipe', 'pipe']});
  const sockets = [];
  try {
    await Promise.race([once(child.stdout, 'data'), new Promise((_, reject) => setTimeout(() => reject(Error('Server did not start')), 5000).unref())]);
    const {token} = await (await fetch(base + '/config')).json();
    const open = () => new Promise((resolve, reject) => {
      const ws = new WebSocket(base.replace('http', 'ws') + '/api/live?token=' + encodeURIComponent(token));
      sockets.push(ws);
      const messages = [];
      ws.onmessage = (event) => messages.push(JSON.parse(event.data));
      ws.onopen = () => resolve({
        ws,
        until: async (match) => {
          const start = Date.now();
          for (;;) {
            const found = messages.find(match);
            if (found) return found;
            if (Date.now() - start > 4000) throw new Error('Timed out waiting for a preference update');
            await new Promise((done) => setTimeout(done, 20));
          }
        },
      });
      ws.onerror = () => reject(new Error('WebSocket failed'));
    });
    const first = await open();
    const second = await open();
    await first.until((message) => message.type === 'preferences');
    await second.until((message) => message.type === 'preferences');
    first.ws.send(JSON.stringify({type: 'patch', patch: {theme: {color: '#336699', preset: 'custom', mode: 'light'}, chatDensity: 'compact', agents: {scout: {color: '#abcdef', icon: ''}}}}));
    const seen = await second.until((message) => message.preferences?.theme?.color === '#336699');
    assert.equal(seen.preferences.theme.mode, 'light');
    assert.equal(seen.preferences.theme.preset, 'custom');
    assert.equal(seen.preferences.chatDensity, 'compact');
    assert.equal(seen.preferences.agents.scout.color, '#abcdef');
    const again = await open();
    const stored = await again.until((message) => message.preferences?.theme?.color === '#336699');
    assert.equal(stored.preferences.agents.scout.color, '#abcdef');
    const denied = new WebSocket(base.replace('http', 'ws') + '/api/live?token=nope');
    sockets.push(denied);
    const closed = await new Promise((resolve) => denied.addEventListener('close', () => resolve(denied.readyState)));
    assert.equal(closed, WebSocket.CLOSED);
    const exited = once(child, 'exit');
    await fetch(base + '/api/shutdown', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-App-Token': token}, body: '{}'});
    await Promise.race([exited, new Promise((_, reject) => setTimeout(() => reject(Error('Workspace did not stop')), 9000).unref())]);
  } finally {
    for (const ws of sockets) ws.close();
    child.kill('SIGINT');
  }
});
