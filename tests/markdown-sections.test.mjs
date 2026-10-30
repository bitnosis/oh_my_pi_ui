import {test} from 'node:test';
import assert from 'node:assert/strict';
import {h2Sections} from '../src/lib/markdown-sections.js';

test('each level-2 heading copies through the line before the next one', () => {
  const text = ['Intro stays out.', '', '## First', 'alpha', '### Nested', 'still first', '', '## Second', 'beta', '', '```', '## not a heading', '```', 'after fence'].join('\n');
  assert.deepEqual(h2Sections(text), ['## First\nalpha\n### Nested\nstill first', '## Second\nbeta\n\n```\n## not a heading\n```\nafter fence']);
});

test('a heading without a follower copies the rest of the message', () => {
  assert.deepEqual(h2Sections('## Only\n\nbody'), ['## Only\n\nbody']);
});
