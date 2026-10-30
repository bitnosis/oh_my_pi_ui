import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readModes,setMode} from '../server/modes.mjs';
function fake(){
  const c={busy:false,state:{fastModeEnabled:false,slowModeSupported:true,autoCompactionEnabled:true},refresh:async()=>{},calls:[],skills:true};
  c.request=async command=>{c.calls.push(command);if(command.type==='get_available_commands')return {commands:[{name:'extended-context',source:'builtin'},{name:'skillful',source:'builtin'}]};if(command.type==='set_fast_mode')c.state.fastModeEnabled=command.enabled;return {};};
  c.modeCommand=async(command,op)=>{if(command==='skillful'&&op!=='status')c.skills=op==='on';return command==='skillful'?`Skill listing: ${c.skills?'on':'off'}`:'Extended context is off.';};
  return c;
}
test('modes reflect native state and unsupported terminal modes stay unavailable',async()=>{
  const c=fake(),{modes}=await readModes(c);
  assert.equal(modes.extended.enabled,false);assert.equal(modes.skills.enabled,true);assert.equal(modes.auto.enabled,true);
  for(const key of ['plan','vibe','loop']){assert.equal(modes[key].supported,false);await assert.rejects(()=>setMode(c,key,true),/native OhMyPi terminal/);}
  assert.ok(!c.calls.some(command=>command.type==='prompt'));
});
test('mode changes are confirmed and busy sessions reject changes',async()=>{
  const c=fake();assert.equal((await setMode(c,'fast',true)).modes.fast.enabled,true);
  assert.equal((await setMode(c,'skills',false)).modes.skills.enabled,false);
  c.busy=true;await assert.rejects(()=>setMode(c,'fast',false),/Wait/);
  await assert.rejects(()=>setMode(c,'unknown',true),/Unknown mode/);
});
