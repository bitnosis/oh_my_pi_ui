import {promises as fs} from 'node:fs';
import {join,dirname,resolve,basename,parse as parsePath} from 'node:path';
import YAML from 'yaml';
import {runOmp,findOmp} from './platform.mjs';
import {agentDirectory,appData,hash} from './storage.mjs';

const recordKeys={model:'agentModelOverrides',prewalk:'agentPrewalk',advisor:'agentAdvisor',tier:'agentServiceTierOverrides',threshold:'agentCompactionThresholdOverrides',budget:'agentSoftRequestBudget'};
const caches=new Map(),locks=new Map();
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const list=value=>Array.isArray(value)?value.filter(v=>typeof v==='string'):typeof value==='string'?value.split(',').map(v=>v.trim()).filter(Boolean):[];
function nameCheck(name){if(typeof name!=='string'||!/^[a-zA-Z][\w-]{0,63}$/.test(name)||['main','sub','__proto__','constructor','prototype'].includes(name.toLowerCase()))throw Error('Use an agent name beginning with a letter and containing only letters, numbers, hyphens, or underscores. Main and sub are reserved.');}
export function parseDefinition(text){
  const match=text.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if(!match)throw Error('An agent needs YAML frontmatter followed by its instructions.');
  const doc=YAML.parseDocument(match[1],{uniqueKeys:true});if(doc.errors.length)throw Error(doc.errors[0].message);
  const fields=doc.toJS({maxAliasCount:0});
  nameCheck(fields?.name);
  if(typeof fields.description!=='string'||!fields.description.trim())throw Error('An agent needs a description.');
  return {fields,doc,prompt:match[2].trim()};
}
async function readText(path){try{return await fs.readFile(path,'utf8');}catch(e){if(e.code==='ENOENT')return '';throw e;}}
async function noSymlinks(path){
  let current=resolve(path);const paths=[];
  while(current!==parsePath(current).root){paths.push(current);current=dirname(current);}
  for(const item of paths.reverse()){const info=await fs.lstat(item).catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(info?.isSymbolicLink())throw Error('Editing agent settings through symbolic links is not supported.');}
}
async function writeChecked(path,text,revision){
  await noSymlinks(path);
  const old=await readText(path);if(hash(old)!==revision)throw Error('This file changed. Reload before saving.');
  await fs.mkdir(dirname(path),{recursive:true});
  if(old)await fs.copyFile(path,path+'.backup-'+Date.now());
  const temp=path+'.tmp-'+process.pid;await fs.writeFile(temp,text,{mode:0o600});await fs.rename(temp,path);
}
async function locked(path,operation){
  const previous=locks.get(path)||Promise.resolve();const next=previous.catch(()=>{}).then(operation);locks.set(path,next);
  try{return await next;}finally{if(locks.get(path)===next)locks.delete(path);}
}
export async function bundledDirectory(profile,folder){
  const executable=findOmp();if(!executable)throw Error('Install OhMyPi to load bundled agents.');
  const stat=await fs.stat(executable),key=hash(executable+':'+stat.size+':'+stat.mtimeMs).slice(0,20);
  const target=join(appData,'bundled-agents',key);
  if(!caches.has(key))caches.set(key,(async()=>{
    await fs.mkdir(target,{recursive:true});
    await runOmp(['agents','unpack','--dir',target,'--json'],{cwd:folder,profile});return target;
  })().catch(e=>{caches.delete(key);throw e;}));
  return caches.get(key);
}
async function projectAgentDirectory(folder){
  let current=folder;
  for(;;){const candidate=join(current,'.omp','agents');if((await fs.stat(candidate).catch(()=>null))?.isDirectory())return candidate;if(dirname(current)===current)return null;current=dirname(current);}
}
export async function listDefinitions({folder,profile='default',bundledDir,settings}){
  const bundle=bundledDir||await bundledDirectory(profile,folder),warnings=[],agents=[],seen=new Set();
  const projectDir=await projectAgentDirectory(folder),userDir=join(agentDirectory(profile),'agents');
  for(const [source,dir] of [['project',projectDir],['user',userDir],['bundled',bundle]]){
    if(!dir)continue;
    const entries=await fs.readdir(dir,{withFileTypes:true}).catch(()=>[]);
    for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
      if(!entry.isFile()||!entry.name.endsWith('.md'))continue;
      const path=join(dir,entry.name);
      try{
        if((await fs.stat(path)).size>512000)throw Error('Definition is larger than 500 KB.');
        const text=await fs.readFile(path,'utf8'),{fields,prompt}=parseDefinition(text);
        if(seen.has(fields.name))continue;seen.add(fields.name);
        agents.push({name:fields.name,description:fields.description,source,path,fields,prompt,revision:hash(text),canEdit:basename(path)===fields.name+'.md'&&(source==='user'||(source==='project'&&resolve(dir)===resolve(folder,'.omp','agents')))});
      }catch(e){warnings.push(entry.name+': '+e.message);}
    }
  }
  if(!settings){const {stdout}=await runOmp(['config','list','--json'],{cwd:folder,profile});settings=JSON.parse(stdout);}
  const values=Object.fromEntries(Object.entries(settings).map(([key,data])=>[key,data.value]));
  const roles=object(values.modelRoles);
  for(const agent of agents){
    agent.enabled=!list(values['task.disabledAgents']).includes(agent.name);
    agent.overrides=Object.fromEntries(Object.entries(recordKeys).map(([field,key])=>[field,object(values['task.'+key])[agent.name]??null]));
    agent.modelSelectors=list(agent.overrides.model||agent.fields.model);
    agent.modelRouting=agent.modelSelectors.map(selector=>selector.startsWith('@')&&roles[selector.slice(1)]?`${selector} → ${roles[selector.slice(1)]}`:selector);
  }
  return {agents,warnings,roles};
}
function settingsPath(folder,profile,scope){if(!['user','project'].includes(scope))throw Error('Choose a project or profile scope.');return join(scope==='user'?agentDirectory(profile):join(folder,'.omp'),'config.yml');}
export async function agentSettings({folder,profile='default',scope='user',name}){
  nameCheck(name);const path=settingsPath(folder,profile,scope),text=await readText(path),data=object(YAML.parse(text,{maxAliasCount:0}));
  const task=object(data.task);
  return {path,revision:hash(text),values:{enabled:!list(task.disabledAgents).includes(name),...Object.fromEntries(Object.entries(recordKeys).map(([field,key])=>[field,object(task[key])[name]??null]))}};
}
export async function saveAgentSettings({folder,profile='default',scope='user',name,values,revision}){
  nameCheck(name);const path=settingsPath(folder,profile,scope);
  return locked(path,async()=>{
    const text=await readText(path);if(hash(text)!==revision)throw Error('Settings changed. Reload before saving.');
    const doc=YAML.parseDocument(text||'{}');if(doc.errors.length)throw Error('The existing configuration has YAML errors. Fix it before saving.');
    const task=object(doc.get('task',true)?.toJSON());
    if(typeof values?.enabled!=='boolean')throw Error('Choose whether the agent is enabled.');
    const disabled=new Set(list(task.disabledAgents));values.enabled?disabled.delete(name):disabled.add(name);
    doc.setIn(['task','disabledAgents'],[...disabled]);
    for(const [field,key] of Object.entries(recordKeys)){
      const value=values[field];
      if(value===null||value===undefined||value===''){if(doc.hasIn(['task',key,name]))doc.deleteIn(['task',key,name]);continue;}
      if(field==='budget'&&(!Number.isInteger(value)||value<0))throw Error('Request budget must be a non-negative whole number.');
      if(field==='threshold'&&!/^(?:[1-9]\d*|(?:[1-9]\d?|100)%)$/.test(String(value)))throw Error('Use a token count or a percentage for compaction.');
      if(field!=='budget'&&(typeof value!=='string'||value.length>500||/[\r\n]/.test(value)))throw Error('Use a short model selector or setting value.');
      if(field==='tier'&&!['inherit','none','default','priority','flex','auto','scale','ultrafast'].includes(value))throw Error('Choose a supported service tier.');
      doc.setIn(['task',key,name],value);
    }
    await writeChecked(path,doc.toString(),revision);return {saved:true,path};
  });
}
export async function saveDefinition({folder,profile='default',scope='project',name,description,prompt,model,tools,spawns,thinking,blocking,readSummarize,revision,create=false}){
  nameCheck(name);if(!['user','project'].includes(scope))throw Error('Choose a project or profile scope.');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>200000||typeof description!=='string'||!description.trim()||description.length>2000)throw Error('Enter a description and instructions (under 200 KB).');
  const dir=scope==='user'?join(agentDirectory(profile),'agents'):join(folder,'.omp','agents'),path=join(dir,name+'.md');
  return locked(path,async()=>{
    const old=await readText(path);
    if(create&&old)throw Error('An agent with this name already exists in this scope.');
    const expected=create?hash(''):revision;if(hash(old)!==expected)throw Error('This definition changed. Reload before saving.');
    const doc=old?parseDefinition(old).doc:new YAML.Document({});
    doc.set('name',name);doc.set('description',description.trim());
    for(const [field,value] of Object.entries({model,tools,spawns})){
      if(typeof value!=='string'||value.length>4000)throw Error('Invalid '+field+' list.');
      if(field==='tools'&&value.trim()==='none')doc.set(field,[]);else if(value.trim())doc.set(field,list(value));else doc.delete(field);
    }
    if(!['','inherit','off','minimal','low','medium','high','xhigh','max','auto'].includes(thinking))throw Error('Choose a valid thinking level.');
    doc.delete('thinking');doc.delete('thinking-level');if(thinking)doc.set('thinkingLevel',thinking);else doc.delete('thinkingLevel');
    doc.set('blocking',Boolean(blocking));doc.delete('readSummarize');doc.set('read-summarize',Boolean(readSummarize));
    const text='---\n'+doc.toString()+'---\n\n'+prompt.trim()+'\n';parseDefinition(text);
    await writeChecked(path,text,expected);return {saved:true,path};
  });
}
