import {test} from 'node:test';
import assert from 'node:assert/strict';
import {traceUrl,openTraceDashboard} from '../server/trace-dashboard.mjs';
test('trace URL keeps session paths encoded and limits the origin to loopback',()=>{
  const session='C:\\Users\\Kylie\\sessions\\one & two#test.jsonl';
  const url=new URL(traceUrl(session));assert.equal(url.origin,'http://127.0.0.1:3847');
  const query=new URLSearchParams(url.hash.split('?')[1]);assert.equal(query.get('s'),session);assert.equal(query.get('range'),'all');
});
test('dashboard reuses native stats and refuses an unrelated local service',async()=>{
  const original=globalThis.fetch;
  try{
    globalThis.fetch=async()=>new Response('',{headers:{'x-omp-stats-dashboard':'3'}});
    assert.equal((await openTraceDashboard({sessionFile:'fixture'})).url,traceUrl('fixture'));
    globalThis.fetch=async()=>new Response('unrelated');
    await assert.rejects(openTraceDashboard({}),/occupied by a different service/);
  }finally{globalThis.fetch=original;}
});
