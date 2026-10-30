import {test} from 'node:test';
import assert from 'node:assert/strict';
import {splitAgentContext, withAgentContext} from '../src/lib/agent-context.js';

test('an attached agent is sent as the agent name OhMyPi uses', () => {
  assert.equal(withAgentContext('Look at the diff', 'scout'), 'agent:scout\n\nLook at the diff');
  assert.equal(withAgentContext('Look at the diff', ['scout', 'reviewer']), 'agent:scout\nagent:reviewer\n\nLook at the diff');
  assert.equal(withAgentContext('Look at the diff', ['scout', 'reviewer', 'task']), 'agent:scout\nagent:reviewer\n\nLook at the diff');
  assert.equal(withAgentContext('Look at the diff', ''), 'Look at the diff');
  assert.deepEqual(splitAgentContext('agent:security-reviewer\n\nCheck this'), {agents: ['security-reviewer'], agent: 'security-reviewer', text: 'Check this'});
  assert.deepEqual(splitAgentContext('agent:scout\nagent:reviewer\n\nCheck this'), {agents: ['scout', 'reviewer'], agent: 'scout', text: 'Check this'});
  assert.deepEqual(splitAgentContext('No agent here'), {agents: [], agent: '', text: 'No agent here'});
});
