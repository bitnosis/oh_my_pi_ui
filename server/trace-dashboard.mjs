import {spawnOmp,stopProcess} from './platform.mjs';
const origin='http://127.0.0.1:3847';
let child,starting;
export function traceUrl(sessionFile){
  const query=new URLSearchParams({range:'all'});
  if(sessionFile)query.set('s',sessionFile);
  return origin+'/#/traces?'+query;
}
async function available(){
  try{
    const response=await fetch(origin,{signal:AbortSignal.timeout(800),redirect:'error'});
    if(!response.ok||!response.headers.has('x-omp-stats-dashboard'))throw Error('Port 3847 is occupied by a different service.');
    return true;
  }catch(e){if(e.message.includes('occupied'))throw e;return false;}
}
export async function openTraceDashboard({folder,profile='default',sessionFile}){
  if(!await available()){
    starting??=(async()=>{
      child=spawnOmp([...(profile==='default'?[]:['--profile',profile]),'stats','--port','3847','--host','127.0.0.1'],{cwd:folder,stdio:['pipe','ignore','pipe']});
      let failure='';child.stderr.on('data',data=>{failure=(failure+data).slice(-1000);});child.on('error',e=>{failure=e.message;});
      for(let i=0;i<80;i++){
        if(await available())return;
        if(child.exitCode!==null||failure&&child.pid===undefined)throw Error('Could not start OhMyPi stats: '+failure);
        await new Promise(r=>setTimeout(r,250));
      }
      stopTraceDashboard();throw Error('OhMyPi stats is still starting. Try again shortly.');
    })().finally(()=>{starting=null;});
    await starting;
  }
  return {url:traceUrl(sessionFile)};
}
export function stopTraceDashboard(){if(child){stopProcess(child);child=null;}}
