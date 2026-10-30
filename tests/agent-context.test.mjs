import {test} from 'node:test';
import assert from 'node:assert/strict';
import {splitAgentContext, withAgentContext} from '../src/lib/agent-context.js';

test('an attached agent is sent as the agent name OhMyPi uses', () => {
  assert.equal(withAgentContext('Look at the diff', 'scout'), 'agent:scout\n\nLook at the diff');
  assert.equal(withAgentContext('Look at the diff', ''), 'Look at the diff');
  assert.deepEqual(splitAgentContext('agent:security-reviewer\n\nCheck this'), {agent: 'security-reviewer', text: 'Check this'});
  assert.deepEqual(splitAgentContext('No agent here'), {agent: '', text: 'No agent here'});
});
