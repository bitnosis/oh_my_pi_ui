import {test} from 'node:test';
import assert from 'node:assert/strict';
import {agentsForModels, assigneesFor} from '../src/lib/model-agents.js';

const models = [
  {provider: 'openai', id: 'gpt-fast', name: 'Fast'},
  {provider: 'openai', id: 'gpt-slow', name: 'Slow'},
  {provider: 'other', id: 'shared', name: 'Shared A'},
  {provider: 'extra', id: 'shared', name: 'Shared B'},
];

test('model rows list the agents routed to them, including role selectors', () => {
  const assigned = agentsForModels(models, [
    {name: 'scout', enabled: true, modelSelectors: ['@fast']},
    {name: 'reviewer', enabled: true, modelSelectors: ['openai/gpt-slow', '@fast']},
    {name: 'retired', enabled: false, modelSelectors: ['openai/gpt-slow']},
    {name: 'inherit', enabled: true, modelSelectors: []},
  ], {fast: 'openai/gpt-fast', slow: '@fast'});
  assert.deepEqual(assigneesFor(models[0], assigned).map((item) => item.name), ['reviewer', 'scout']);
  assert.equal(assigneesFor(models[0], assigned).find((item) => item.name === 'reviewer').fallback, true);
  assert.deepEqual(assigneesFor(models[1], assigned).map((item) => item.name), ['reviewer']);
  assert.equal(assigneesFor(models[1], assigned)[0].fallback, false);
  assert.deepEqual(assigneesFor(models[2], assigned), []);
});

test('a bare model id matches only when that id is unique', () => {
  const assigned = agentsForModels(models, [
    {name: 'planner', enabled: true, modelSelectors: ['gpt-slow']},
    {name: 'ambiguous', enabled: true, modelSelectors: ['shared']},
  ], {});
  assert.deepEqual(assigneesFor(models[1], assigned).map((item) => item.name), ['planner']);
  assert.deepEqual(assigneesFor(models[2], assigned), []);
  assert.deepEqual(assigneesFor(models[3], assigned), []);
});
