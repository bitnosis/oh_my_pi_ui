import http from 'node:http';
import {promises as fs} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname,basename} from 'node:path';
import {homedir} from 'node:os';
import {findOmp,runOmp} from './server/platform.mjs';
import {AgentConnection} from './server/rpc.mjs';
import {profiles,savedProjects,saveProject,allSessions,knownSession,validFolder,browseFolders,listFiles,readProjectFile,worktrees,addWorktree,removeWorktree,mcpConfig,saveMcp,appData} from './server/storage.mjs';

const root=fileURLToPath(new URL('.',import.meta.url));
const port=Number(process.env.PORT||4320),origin=`http://127.0.0.1:${port}`,token=randomUUID();
const development=process.argv.includes('--dev');
const vite=development?await(await import('vite')).createServer({root,server:{middlewareMode:true,hmr:{port:port+1,host:'127.0.0.1'}},appType:'spa'}):null;
const dist=resolve(root,'dist'),connections=new Map(),streams=new Set();
const rpcCommands=new Set(['get_state','get_available_models','set_model','cycle_model','get_available_thinking_levels','set_thinking_level','set_fast_mode','set_slow_mode','set_auto_compaction','set_auto_retry','set_steering_mode','set_follow_up_mode','set_interrupt_mode','set_cache_warming','get_session_stats','get_tree','get_entries','get_subagents','get_subagent_messages','cancel_subagent','steer_subagent','get_available_commands','get_login_providers','login','get_logout_accounts','logout','set_session_name','new_session','fork','branch','navigate_tree','set_label','compact','abort','abort_retry','steer','follow_up','remove_queued_message','promote_queued_message','abort_and_restore_queue','get_btw_history','btw','btw_cancel','goal']);
const transitions=new Set(['new_session','fork','branch','navigate_tree']);
const emit=(res,e)=>res.write(`data: ${JSON.stringify(e)}\n\n`);
function json(res,data,status=200){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
function connection(id){const found=connections.get(id);if(!found||found.closed)throw new Error('Choose a running session first.');return found;}
async function project(folder){folder=await validFolder(folder);const known=(await savedProjects()).some(p=>p.folder===folder)||(await allSessions()).some(s=>s.folder===folder)||[...connections.values()].some(c=>c.folder===folder);if(!known)throw new Error('Add this project before using its workspace tools.');return folder;}
async function overview(refresh=false){
  const sessions=await allSessions(refresh),saved=await savedProjects();
  const projects=[...new Map([...saved,...sessions.map(s=>({folder:s.folder,name:basename(s.folder)}))].map(p=>[p.folder,p])).values()];
  return {projects,sessions,running:[...connections.values()].filter(c=>!c.closed).map(c=>c.summary()),profiles:await profiles(),executable:findOmp()||null,platform:process.platform,home:homedir(),dataDirectory:appData};
}
async function start({folder,profile='default',sessionPath,restore=false}){
  if(!(await profiles()).includes(profile))throw new Error('Choose an existing OhMyPi profile.');
  if(sessionPath){const saved=await knownSession(sessionPath);folder=saved.folder;profile=saved.profile;
    const active=[...connections.values()].find(c=>!c.closed&&(c.state.sessionFile===sessionPath||c.sessionPath===sessionPath));if(active)return active.summary();}
  folder=await validFolder(folder);await saveProject(folder);
  if([...connections.values()].filter(c=>!c.closed).length>=16)throw new Error('Close an idle session before starting another (16 running sessions maximum).');
  for(const [id,c] of connections)if(c.closed)connections.delete(id);
  const c=new AgentConnection({folder,profile,sessionPath,restore});connections.set(c.id,c);return c.summary();
}
async function cliJson(args,folder,profile){const {stdout}=await runOmp(args,{cwd:folder||root,profile});try{return JSON.parse(stdout);}catch{throw new Error('This OhMyPi version did not return structured output. Update OhMyPi and try again.');}}
async function api(path,data){
  if(path==='/api/shutdown'){setTimeout(shutdown,100);return {closing:true};}
  if(path==='/api/overview')return overview(data.refresh);
  if(path==='/api/projects/add')return {projects:await saveProject(data.folder)};
  if(path==='/api/folders')return browseFolders(data.path||homedir());
  if(path==='/api/start')return start(data);
  if(path==='/api/stop'){connection(data.connectionId).stop();return {};}
  if(path==='/api/state')return connection(data.connectionId).state;
  if(path==='/api/rpc'){
    const c=connection(data.connectionId),command=data.command;
    if(!command||!rpcCommands.has(command.type))throw new Error('Unsupported workspace command.');
    if(c.initializing)throw new Error('OhMyPi is still loading this session.');
    if(transitions.has(command.type)&&c.busy)throw new Error('Stop the current turn before changing the conversation tree.');
    const result=await c.request(command,command.type==='login'?300000:command.type==='compact'?180000:30000);
    if(transitions.has(command.type)&&!result.cancelled)await c.hydrate();
    if(command.type.startsWith('set_')||['goal',...transitions].includes(command.type))await c.refresh();
    return result;
  }
  if(path==='/api/prompt'){
    const c=connection(data.connectionId);
    if(c.initializing)throw new Error('OhMyPi is still loading this session.');
    if(typeof data.message!=='string'||!data.message.trim())throw new Error('Enter a message.');
    const behavior=['steer','followUp'].includes(data.streamingBehavior)?data.streamingBehavior:undefined;
    if(c.busy&&!behavior)throw new Error('Choose Steer or Follow up while the agent is working.');
    c.publish({type:'user_message',text:data.message});
    try{const result=await c.request({type:'prompt',message:data.message,...(behavior?{streamingBehavior:behavior}:{}),...(Array.isArray(data.images)?{images:data.images}:{})});if(result.agentInvoked!==false){c.busy=true;c.status();}return result;}
    catch(error){c.publish({type:'problem',text:error.message});throw error;}
  }
  if(path==='/api/answer'){connection(data.connectionId).answer(data);return {};}
  if(path==='/api/files')return {files:await listFiles(await project(data.folder),data.path||'')};
  if(path==='/api/file')return readProjectFile(await project(data.folder),data.path);
  if(path==='/api/worktrees')return {worktrees:await worktrees(await project(data.folder))};
  if(path==='/api/worktrees/add')return addWorktree(await project(data.folder),data.branch);
  if(path==='/api/worktrees/remove'){
    if([...connections.values()].some(c=>!c.closed&&resolve(c.folder)===resolve(data.path)))throw new Error('Close sessions using this worktree before removing it.');
    return removeWorktree(await project(data.folder),data.path);
  }
  if(path==='/api/settings')return cliJson(['config','list','--json'],data.folder?await project(data.folder):root,data.profile);
  if(path==='/api/settings/save'){
    if(!/^[\w.]+$/.test(data.key))throw new Error('Invalid setting key.');
    const folder=data.folder?await project(data.folder):root;
    const schema=await cliJson(['config','list','--json'],folder,data.profile);if(!schema[data.key])throw new Error('Unknown setting.');
    const args=data.reset?['config','reset',data.key,'--json']:['config','set',data.key,typeof data.value==='string'?data.value:JSON.stringify(data.value),'--json'];
    const {stdout}=await runOmp(args,{cwd:folder,profile:data.profile});return {saved:true,message:schema[data.key].redacted?'Credential updated.':stdout.slice(0,1000)};
  }
  if(path==='/api/mcp')return mcpConfig(data.profile,data.folder?await project(data.folder):root,data.scope);
  if(path==='/api/mcp/save')return saveMcp({...data,folder:data.folder?await project(data.folder):root});
  if(path==='/api/packages'){
    if(!['plugin','skill'].includes(data.kind))throw new Error('Choose plugins or skills.');
    return cliJson([data.kind,'list','--json'],data.folder?await project(data.folder):root,data.profile);
  }
  if(path==='/api/packages/change'){
    if(!['plugin','skill'].includes(data.kind)||!['install','uninstall','enable','disable','update'].includes(data.action)||typeof data.target!=='string'||!data.target.trim()||data.target.startsWith('-'))throw new Error('Invalid package action.');
    if(data.kind==='skill'&&['enable','disable'].includes(data.action))throw new Error('Skills support install, uninstall, and update.');
    const args=[data.kind,data.action,data.target];
    if(data.kind==='plugin')args.push('--scope',data.scope==='project'?'project':'user');
    if(data.kind==='skill'&&data.scope!=='project')args.push('--global');
    const {stdout}=await runOmp(args,{cwd:data.folder?await project(data.folder):root,profile:data.profile,timeout:180000});return {message:stdout.slice(-12000)};
  }
  throw new Error('Unknown workspace operation.');
}

const server=http.createServer(async(req,res)=>{
  if(req.headers.host!==`127.0.0.1:${port}`||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403).end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'"+(development?' ws://127.0.0.1:*':'')+"; img-src 'self' data:; frame-ancestors 'none'");
  if(req.method==='GET'&&req.url==='/config'){json(res,{token,app:'ohmypi-workspace'});return;}
  const url=new URL(req.url,origin);
  if(req.method==='GET'&&url.pathname==='/api/events'){
    if(url.searchParams.get('token')!==token){res.writeHead(403).end();return;}
    const c=connections.get(url.searchParams.get('connectionId'));if(!c){json(res,{error:'Session not found.'},404);return;}
    res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});streams.add(res);
    emit(res,{type:'reset'});for(const item of c.history)emit(res,item.event);emit(res,{type:'status',...c.summary()});emit(res,{type:'state',data:c.state});
    for(const dialog of c.dialogs.values())emit(res,dialog);
    const listener=e=>emit(res,e);c.on('event',listener);
    const timer=setInterval(()=>res.write(': heartbeat\n\n'),15000);
    res.on('close',()=>{streams.delete(res);clearInterval(timer);c.off('event',listener);});return;
  }
  if(req.method==='POST'){
    if(req.headers['x-app-token']!==token){res.writeHead(403).end();return;}
    try{
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>12*1024*1024)throw new Error('Request is too large.');}
      const data=JSON.parse(body||'{}');json(res,await api(url.pathname,data));
    }catch(error){json(res,{error:error.message},400);}return;
  }
  if(req.method!=='GET'||url.pathname.startsWith('/api/')){res.writeHead(404).end();return;}
  if(vite){vite.middlewares(req,res,()=>res.writeHead(404).end());return;}
  try{
    const path=resolve(dist,url.pathname==='/'?'index.html':'.'+decodeURIComponent(url.pathname));
    if(!path.startsWith(dist+sep))throw new Error('Not found');
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
    const content=await fs.readFile(path);res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(content);
  }catch{res.writeHead(404).end('Not found. Run npm run build before npm start.');}
});
server.listen(port,'127.0.0.1',()=>console.log(`OhMyPi workspace: ${origin}`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
async function shutdown(){for(const c of connections.values())if(!c.closed)c.stop();for(const res of streams)res.end();await vite?.close();server.close();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
