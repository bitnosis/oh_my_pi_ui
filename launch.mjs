#!/usr/bin/env node
import http from 'node:http';
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,openSync,closeSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||4320),url=`http://127.0.0.1:${port}`;
const data=process.env.OMP_WEB_DATA_DIR||join(root,'.workspace');mkdirSync(data,{recursive:true});
const logPath=join(data,'launcher.log'),log=openSync(logPath,'a');
function browser(){
  const child=process.platform==='win32'?spawn(process.env.ComSpec||'cmd.exe',['/d','/c','start','',url],{windowsHide:true,detached:true,stdio:'ignore'}):spawn('xdg-open',[url],{detached:true,stdio:'ignore'});
  child.on('error',error=>console.error('Open '+url+' in your browser. '+error.message));child.unref();
}
async function healthy(){try{const response=await fetch(url+'/config',{signal:AbortSignal.timeout(1000)});return response.ok&&(await response.json()).app==='ohmypi-workspace';}catch{return false;}}
if(await healthy()){
  if(process.argv.includes('--restart')){
    const {token}=await(await fetch(url+'/config')).json();
    await fetch(url+'/api/shutdown',{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':token},body:'{}'});
    for(let i=0;i<40;i++){if(!await healthy())break;await new Promise(resolve=>setTimeout(resolve,250));}
  }else{browser();closeSync(log);process.exit(0);}
}
let phase='Starting your workspace…',failed=false;
const escape=text=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const startup=http.createServer((req,res)=>{
  if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403).end();return;}
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(`<!doctype html><html><head><meta charset="utf-8">${failed?'':'<meta http-equiv="refresh" content="2">'}<title>Starting OhMyPi-UI</title><style>body{font:16px/1.8 system-ui;background:#151916;color:#eceee9;max-width:650px;margin:15vh auto;padding:30px}h1{font-size:32px}code{overflow-wrap:anywhere}</style></head><body><h1>⌥ OhMyPi-UI</h1><p>${escape(phase)}</p><p>${failed?'Details are in <code>'+escape(logPath)+'</code>. After resolving the issue, reopen the launcher.':'This page will open your workspace automatically. You can leave the terminal closed.'}</p></body></html>`);
});
try{
  await new Promise((resolve,reject)=>{startup.once('error',reject);startup.listen(port,'127.0.0.1',resolve);});
  browser();
  async function npm(args){
    await new Promise((resolve,reject)=>{
      const child=process.platform==='win32'?spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c','npm '+args.join(' ')],{cwd:root,windowsHide:true,stdio:['ignore',log,log]}):spawn('npm',args,{cwd:root,stdio:['ignore',log,log]});
      child.on('error',reject);child.on('close',code=>code?reject(new Error('Setup failed. See the launcher log.')):resolve());
    });
  }
  if(!existsSync(join(root,'node_modules','svelte','package.json'))){phase='First-time setup: installing the app’s dependencies…';await npm(['ci']);}
  if(!existsSync(join(root,'dist','index.html'))){phase='First-time setup: building the interface…';await npm(['run','build']);}
  phase='Opening your workspace…';
  await new Promise(resolve=>startup.close(resolve));
  const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:process.env,detached:true,windowsHide:true,stdio:['ignore',log,log]});
  child.unref();
  for(let i=0;i<60;i++){if(await healthy()){closeSync(log);process.exit(0);}await new Promise(resolve=>setTimeout(resolve,500));}
  throw new Error('The workspace did not start. See '+logPath);
}catch(error){
  console.error(error.message);phase=error.message;failed=true;
  // Do not leave an error-page server holding the port indefinitely.
  setTimeout(()=>{startup.close();closeSync(log);process.exitCode=1;},120000).unref();
  if(!startup.listening){closeSync(log);process.exitCode=1;}
}
