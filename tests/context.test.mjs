import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {AgentConnection} from '../server/rpc.mjs';
function connection(commands,report){
  const c=new EventEmitter();c.busy=false;
  c.request=async command=>{
    if(command.type==='get_session_stats')return {contextUsage:{tokens:120,contextWindow:1000,percent:12}};
    if(command.type==='get_available_commands')return {commands};
    assert.equal(command.message,'/context');c.emit('context_report',{type:'command_output',text:report});return {agentInvoked:false};
  };
  return c;
}
test('context report uses the installed builtin and strips terminal formatting',async()=>{
  const c=connection([{name:'context',source:'builtin'}],'Context window: 1000 tokens\n  System prompt [\u001b[31m██\u001b[0m] 12%  120 tokens');
  const result=await AgentConnection.prototype.contextStats.call(c);
  assert.match(result.report,/System prompt \[██\]/);assert.ok(!result.report.includes('\u001b'));assert.equal(c.listenerCount('context_report'),0);
});
test('missing or busy context report never sends a prompt',async()=>{
  for(const busy of [false,true]){
    const c=connection([{name:'context',source:'extension'}],'');c.busy=busy;
    const result=await AgentConnection.prototype.contextStats.call(c);assert.ok(result.note);assert.equal(result.report,undefined);
  }
});
