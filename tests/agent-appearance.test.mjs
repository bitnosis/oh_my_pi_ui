import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAppearance, readAppearance, writeAppearance} from '../src/lib/agent-appearance.js';

function memory() {
  const data = new Map();
  return {getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}

test('appearance keeps a color and leaves room for an icon', () => {
  assert.deepEqual(normalizeAppearance({color: '#Be3C4F', icon: 'leaf'}), {color: '#be3c4f', icon: 'leaf'});
  assert.equal(normalizeAppearance({color: 'red', icon: ''}), null);
  const storage = memory();
  writeAppearance({scout: {color: '#112233', icon: ''}, '../nope': {color: '#000000', icon: ''}, reviewer: {color: '', icon: 'pen'}}, storage);
  assert.deepEqual(readAppearance(storage), {scout: {color: '#112233', icon: ''}, reviewer: {color: '', icon: 'pen'}});
});
