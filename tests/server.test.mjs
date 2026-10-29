import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

test('workspace discovers saved sessions, isolates running agents and protects actions', {timeout:30000}, async()=>{
  const dir=mkdtempSync(join(tmpdir(),'omp-workspace-')),agentDir=join(dir,'agent'),project=join(dir,'project');mkdirSync(project);mkdirSync(join(agentDir,'sessions','project'),{recursive:true});
  const session=join(agentDir,'sessions','project','saved.jsonl');
  writeFileSync(session,JSON.stringify({type:'title',title:'Saved test conversation'})+'\n'+JSON.stringify({type:'session',id:'saved-test',cwd:project,timestamp:new Date().toISOString()})+'\n');
  const mock=join(dir,'mock.mjs');writeFileSync(mock,`import{createInterface}from'node:readline';const emit=e=>console.log(JSON.stringify(e));emit({type:'ready',supportedProtocolVersions:[1,2]});
createInterface({input:process.stdin}).on('line',l=>{const c=JSON.parse(l);const respond=data=>emit({type:'response',id:c.id,command:c.type,success:true,data});
if(c.type==='get_state')respond({sessionId:'mock',isStreaming:false,model:{provider:'test',id:'mock-model'}});
else if(c.type==='get_messages_page')respond({messages:[],totalMessages:0});
else if(c.type==='get_tree')respond({tree:[],leafId:null});
else if(c.type==='prompt'){respond({});emit({type:'agent_start'});emit({type:'message_start',message:{role:'assistant'}});emit({type:'message_update',assistantMessageEvent:{type:'text_delta',delta:'## Hello from mock'}});emit({type:'message_end',message:{role:'assistant',content:[{type:'text',text:'## Hello from mock'}]}});emit({type:'session_settled'});}
else respond({});});`);
  const command=join(dir,process.platform==='win32'?'omp.cmd':'omp');writeFileSync(command,process.platform==='win32'?`@echo off\r\n"${process.execPath}" "${mock}"\r\n`:`#!/bin/sh\n"${process.execPath}" "${mock}"\n`,{mode:0o755});
  const port=45000+Math.floor(Math.random()*10000),base='http://127.0.0.1:'+port;
  const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),OMP_COMMAND:command,PI_CONFIG_DIR:dir,PI_CODING_AGENT_DIR:agentDir,OMP_WEB_DATA_DIR:join(dir,'app')},stdio:['ignore','pipe','pipe']});
  const controllers=[];
  try{
    await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(Error('Server did not start')),5000).unref())]);
    assert.equal((await fetch(base)).status,200);
    const {token,app}=await(await fetch(base+'/config')).json();assert.equal(app,'ohmypi-workspace');
    const post=(path,data={},headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':token,...headers},body:JSON.stringify(data)});
    const call=async(path,data)=>{const response=await post(path,data),result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;};
    assert.equal((await post('/api/start',{folder:project},{Origin:'https://evil.example'})).status,403);
    assert.equal((await post('/api/start',{folder:project},{'X-App-Token':'bad'})).status,403);
    assert.equal((await post('/api/rpc',{command:{type:'bash',command:'ignored'}})).status,400);
    const overview=await call('/api/overview');assert.equal(overview.sessions[0].title,'Saved test conversation');
    const first=await call('/api/start',{sessionPath:session});const second=await call('/api/start',{folder:project});assert.notEqual(first.id,second.id);
    const stream=async id=>{
      const controller=new AbortController();controllers.push(controller);setTimeout(()=>controller.abort(),10000).unref();
      const response=await fetch(base+'/api/events?token='+token+'&connectionId='+id,{signal:controller.signal});
      const reader=response.body.getReader();let output='';
      return {until:async text=>{while(!output.includes(text)){const {done,value}=await reader.read();assert.ok(!done);output+=new TextDecoder().decode(value);}return output;},read:()=>output};
    };
    const a=await stream(first.id),b=await stream(second.id);await a.until('"ready":true');await b.until('"ready":true');
    await call('/api/prompt',{connectionId:first.id,message:'hello'});await a.until('Hello from mock');assert.ok(!b.read().includes('Hello from mock'));
    await call('/api/rpc',{connectionId:first.id,command:{type:'get_tree'}});
    assert.equal((await post('/api/file',{folder:project,path:'../mock.mjs'})).status,400);
    assert.equal((await post('/api/start',{folder:join(dir,'missing')})).status,400);
    await call('/api/stop',{connectionId:first.id});await call('/api/stop',{connectionId:second.id});
  }finally{for(const controller of controllers)controller.abort();child.kill('SIGINT');}
});
