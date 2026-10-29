import {promises as fs} from 'node:fs';
import {join,resolve,relative,isAbsolute,basename,dirname,delimiter} from 'node:path';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
import {runProcess} from './platform.mjs';

export const appData=resolve(process.env.OMP_WEB_DATA_DIR||join(process.cwd(),'.workspace'));
export const configRoot=resolve(process.env.PI_CONFIG_DIR||join(homedir(),'.omp'));
const registryPath=join(appData,'projects.json');
export async function profiles(){
  const names=['default'];
  for(const entry of await fs.readdir(join(configRoot,'profiles'),{withFileTypes:true}).catch(()=>[]))if(entry.isDirectory())names.push(entry.name);
  const env=process.env.OMP_PROFILE||process.env.PI_PROFILE;if(env&&!names.includes(env))names.push(env);
  return names;
}
export function agentDirectory(profile='default'){
  if(!/^[\w.-]+$/.test(profile)||profile==='..')throw new Error('Invalid profile name.');
  return profile==='default'?resolve(process.env.PI_CODING_AGENT_DIR||join(configRoot,'agent')):join(configRoot,'profiles',profile,'agent');
}
export async function validFolder(path){if(typeof path!=='string'||!isAbsolute(path))throw new Error('Choose an absolute project folder path.');const full=await fs.realpath(path);if(!(await fs.stat(full)).isDirectory())throw new Error('Choose an existing folder.');return full;}
export async function savedProjects(){return JSON.parse(await fs.readFile(registryPath,'utf8').catch(()=>'[]'));}
export async function saveProject(folder){
  folder=await validFolder(folder);const list=await savedProjects();
  if(!list.some(p=>p.folder===folder)){list.push({folder,name:basename(folder),addedAt:new Date().toISOString()});await fs.mkdir(appData,{recursive:true});await fs.writeFile(registryPath,JSON.stringify(list,null,2));}
  return list;
}

async function findSessions(dir,results,depth=0){
  if(depth>6)return;
  for(const entry of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])){
    const path=join(dir,entry.name);
    if(entry.isDirectory())await findSessions(path,results,depth+1);
    else if(entry.isFile()&&entry.name.endsWith('.jsonl'))results.push(path);
  }
}
const metadataCache=new Map();
export async function readSessionMetadata(path,profile='default'){
  const handle=await fs.open(path,'r');
  try{
    const stat=await handle.stat();const cached=metadataCache.get(path);if(cached&&cached.size===stat.size&&cached.modified===stat.mtimeMs)return cached.value;
    const head=Buffer.alloc(Math.min(65536,stat.size));await handle.read(head,0,head.length,0);
    const lines=head.toString('utf8').split('\n');let header,title,firstPrompt='';
    for(const line of lines){try{const e=JSON.parse(line);if(e.type==='session')header=e;if(e.type==='title')title=e.title;if(!firstPrompt&&e.type==='message'&&e.message?.role==='user')firstPrompt=typeof e.message.content==='string'?e.message.content:e.message.content?.filter(c=>c.type==='text').map(c=>c.text).join(' ')||'';}catch{}}
    if(!title&&!firstPrompt&&stat.size>65536){
      const extended=Buffer.alloc(Math.min(2*1024*1024,stat.size));await handle.read(extended,0,extended.length,0);
      for(const line of extended.toString('utf8').split('\n')){try{const e=JSON.parse(line);if(e.type==='message'&&e.message?.role==='user'){firstPrompt=typeof e.message.content==='string'?e.message.content:e.message.content?.filter(c=>c.type==='text').map(c=>c.text).join(' ')||'';if(firstPrompt)break;}}catch{}}
    }
    if(!header?.cwd)return null;
    const tail=Buffer.alloc(Math.min(stat.size,65536));await handle.read(tail,0,tail.length,Math.max(0,stat.size-tail.length));
    let preview=firstPrompt,count=0;
    for(const line of tail.toString('utf8').split('\n')){
      try{const e=JSON.parse(line);if(e.type==='session_info'&&e.name)title=e.name;if(e.type==='title_change'&&e.title)title=e.title;if(e.type==='message'){count++;if(e.message?.role==='user'){preview=typeof e.message.content==='string'?e.message.content:e.message.content?.filter(c=>c.type==='text').map(c=>c.text).join(' ')||preview;}}}catch{}
    }
    const value={path,id:header.id,folder:header.cwd,title:title||header.title||firstPrompt.slice(0,80)||preview.slice(0,80)||'Untitled session',preview:preview.slice(0,180),updatedAt:stat.mtime.toISOString(),createdAt:header.timestamp,profile,parentSession:header.parentSession,bytes:stat.size,recentMessageCount:count};
    metadataCache.set(path,{size:stat.size,modified:stat.mtimeMs,value});return value;
  }finally{await handle.close();}
}
let sessionCache={time:0,list:[]};
export async function allSessions(refresh=false){
  if(!refresh&&Date.now()-sessionCache.time<5000)return sessionCache.list;
  const list=[];
  for(const profile of await profiles()){
    const roots=[join(agentDirectory(profile),'sessions')];
    // OMP's XDG mode relocates persistent sessions to its state directory.
    if(process.env.XDG_STATE_HOME)roots.push(profile==='default'?join(process.env.XDG_STATE_HOME,'omp','sessions'):join(process.env.XDG_STATE_HOME,'omp','profiles',profile,'sessions'));
    if(process.env.OMP_SESSION_DIRS)roots.push(...process.env.OMP_SESSION_DIRS.split(delimiter));
    for(const root of new Set(roots)){
      const paths=[];await findSessions(root,paths);
      for(let i=0;i<paths.length;i+=24){const batch=await Promise.all(paths.slice(i,i+24).map(p=>readSessionMetadata(p,profile).catch(()=>null)));list.push(...batch.filter(Boolean));}
    }
  }
  const unique=[...new Map(list.map(s=>[s.path,s])).values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  sessionCache={time:Date.now(),list:unique};return unique;
}
export async function knownSession(path){const found=(await allSessions(true)).find(s=>s.path===path);if(!found)throw new Error('Session not found in OhMyPi session storage.');return found;}
export async function browseFolders(path=homedir()){
  path=await validFolder(path);
  const entries=await fs.readdir(path,{withFileTypes:true});
  return {path,parent:dirname(path),folders:entries.filter(e=>e.isDirectory()&&!e.name.startsWith('.')).map(e=>({name:e.name,path:join(path,e.name)})).sort((a,b)=>a.name.localeCompare(b.name))};
}
const excluded=new Set(['.git','.env','.aws','.ssh','.codex','node_modules','.workspace']);
export async function safeProjectPath(root,path=''){
  const base=await validFolder(root),target=await fs.realpath(resolve(base,path)),rel=relative(base,target);
  if(rel.startsWith('..')||isAbsolute(rel)||rel.split(/[\\/]/).some(p=>excluded.has(p)||p.startsWith('.env')))throw new Error('This path is outside the project or contains private runtime files.');
  return target;
}
export async function listFiles(root,path=''){
  const target=await safeProjectPath(root,path);const entries=await fs.readdir(target,{withFileTypes:true});
  return entries.filter(e=>!excluded.has(e.name)&&!e.name.startsWith('.env')&&!e.isSymbolicLink()).map(e=>({name:e.name,path:relative(root,join(target,e.name)),directory:e.isDirectory()})).sort((a,b)=>Number(b.directory)-Number(a.directory)||a.name.localeCompare(b.name));
}
export async function readProjectFile(root,path){const target=await safeProjectPath(root,path);const stat=await fs.stat(target);if(!stat.isFile()||stat.size>1024*1024)throw new Error('Choose a text file smaller than 1 MB.');const text=await fs.readFile(target,'utf8');if(text.includes('\0'))throw new Error('Binary file preview is unavailable.');return {path,text};}
export async function worktrees(folder){
  let stdout,separator='\0';
  try{({stdout}=await runProcess('git',['-C',folder,'worktree','list','--porcelain','-z']));}
  catch(error){if(!/unknown switch.*z|unknown option.*z/i.test(error.message))throw error;({stdout}=await runProcess('git',['-c','core.quotePath=false','-C',folder,'worktree','list','--porcelain']));separator='\n';}
  const result=[];let current;
  for(const raw of stdout.split(separator)){
    const field=raw.replace(/\r$/,'');
    if(field.startsWith('worktree ')){let path=field.slice(9);if(path.startsWith('"')){try{path=JSON.parse(path);}catch{}}current={path};result.push(current);}
    else if(current&&field.startsWith('branch '))current.branch=field.slice(7).replace('refs/heads/','');
    else if(current&&field.startsWith('HEAD '))current.head=field.slice(5);
    else if(current&&field==='bare')current.bare=true;
  }
  return result;
}
export async function addWorktree(folder,branch){
  if(typeof branch!=='string'||!branch.trim()||branch.startsWith('-'))throw new Error('Enter a valid new branch name.');
  await runProcess('git',['check-ref-format','--branch',branch]);
  const {stdout}=await runProcess('git',['-C',folder,'rev-parse','--show-toplevel']);
  const repo=stdout.trim(),parent=join(dirname(repo),basename(repo)+'-worktrees');
  const destination=join(parent,branch.replace(/[^\w.-]/g,'-')+'-'+Date.now().toString(36));
  await fs.mkdir(parent,{recursive:true});
  await runProcess('git',['-C',repo,'worktree','add','-b',branch,destination,'HEAD']);
  await saveProject(destination);return {path:destination,branch};
}
export async function removeWorktree(folder,path){
  const list=await worktrees(folder);if(!list.some((w,i)=>i>0&&w.path===path))throw new Error('Only a linked worktree can be removed.');
  // No force: Git refuses dirty or locked worktrees, preserving user changes.
  await runProcess('git',['-C',folder,'worktree','remove',path]);return {removed:true};
}
export const hash=text=>createHash('sha256').update(text).digest('hex');
export async function mcpConfig(profile,folder,scope='project'){
  const base=scope==='user'?agentDirectory(profile):join(await validFolder(folder),'.omp');
  const path=join(base,'mcp.json'),text=await fs.readFile(path,'utf8').catch(e=>{if(e.code==='ENOENT')return '{\n  "mcpServers": {}\n}\n';throw e;});
  return {path,text,revision:hash(text)};
}
export async function saveMcp({profile,folder,scope,text,revision}){
  if(typeof text!=='string'||text.length>500000)throw new Error('MCP configuration is too large.');
  const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data)||!data.mcpServers||typeof data.mcpServers!=='object'||Array.isArray(data.mcpServers))throw new Error('MCP config must contain a mcpServers object.');
  const old=await mcpConfig(profile,folder,scope);if(old.revision!==revision)throw new Error('This file changed. Reload it before saving.');
  const base=dirname(old.path);await fs.mkdir(base,{recursive:true});
  if((await fs.lstat(base)).isSymbolicLink()||(await fs.lstat(old.path).catch(()=>null))?.isSymbolicLink())throw new Error('Editing a symlinked MCP configuration is not supported.');
  if(await fs.stat(old.path).catch(()=>null))await fs.copyFile(old.path,old.path+'.backup-'+Date.now());
  const temp=old.path+'.tmp-'+process.pid;await fs.writeFile(temp,text,{mode:0o600});await fs.rename(temp,old.path);return {saved:true,path:old.path};
}
