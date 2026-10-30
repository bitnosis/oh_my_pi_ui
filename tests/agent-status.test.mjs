import {test} from 'node:test';
import assert from 'node:assert/strict';
import {describeAgentStatus} from '../src/lib/agent-status.js';

test('agent cards prefer the liveliest status', () => {
  assert.deepEqual(describeAgentStatus({enabled: false, sessionReady: true, lives: [{status: 'running'}]}), {key: 'disabled', label: 'Disabled', detail: ''});
  assert.equal(describeAgentStatus({enabled: true, sessionReady: false}).label, 'No session');
  assert.equal(describeAgentStatus({enabled: true, sessionReady: true}).label, 'Ready to work');
  assert.deepEqual(
    describeAgentStatus({enabled: true, sessionReady: true, lives: [{status: 'idle'}, {status: 'running', task: 'Review the diff'}, {status: 'running'}]}),
    {key: 'running', label: 'Working · 2', detail: 'Review the diff'},
  );
  assert.equal(describeAgentStatus({enabled: true, sessionReady: true, lives: [{status: 'parked'}]}).label, 'Parked');
  assert.equal(describeAgentStatus({enabled: true, sessionReady: true, lives: [{status: 'aborted'}]}).label, 'Stopped');
});
