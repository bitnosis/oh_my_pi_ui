import {runProcess} from './platform.mjs';
import {hash} from './storage.mjs';
import {lstat} from 'node:fs/promises';
import {join} from 'node:path';
const locks=new Map();
const git=async(folder,args,options={})=> (await runProcess('git',['--literal-pathspecs','-c','core.quotePath=false','-C',folder,...args],{limit:4*1024*1024,...options})).stdout;
const quietGit={env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}};
async function root(folder){return (await git(folder,['rev-parse','--show-toplevel'])).trim();}
export async function gitStatus(folder){
  folder=await root(folder);
  const raw=await git(folder,['status','--porcelain=v1','-z','--untracked-files=all']),parts=raw.split('\0'),files=[];
  for(let i=0;i<parts.length;i++){const entry=parts[i];if(!entry)continue;const x=entry[0],y=entry[1],path=entry.slice(3);const original=x==='R'||x==='C'||y==='R'||y==='C'?parts[++i]:null;files.push({path,original,x,y,staged:x!==' '&&x!=='?',unstaged:y!==' '||x==='?',conflict:x==='U'||y==='U'||['AA','DD'].includes(x+y)});}
  const branch=await git(folder,['symbolic-ref','--short','-q','HEAD']).catch(()=>'(detached HEAD)');
  const index=await git(folder,['diff','--cached','--raw','-z','--no-ext-diff','--no-textconv']);
  const stamps=await Promise.all(files.map(async file=>{const info=await lstat(join(folder,file.path)).catch(()=>null);return [file.path,info?.size,info?.mtimeMs,info?.ctimeMs];}));
  let ahead=0,behind=0;
  try{
    const counts=(await git(folder,['rev-list','--left-right','--count','HEAD...@{upstream}'])).trim().split(/\s+/);
    if(counts.length>=2){ahead=Number(counts[0])||0;behind=Number(counts[1])||0;}
  }catch{}
  return {root:folder,branch:branch.trim(),ahead,behind,files,revision:hash(raw+index+JSON.stringify(stamps))};
}
export async function gitBranches(folder){
  folder=await root(folder);
  const current=(await git(folder,['symbolic-ref','--short','-q','HEAD']).catch(()=>'')).trim();
  const branches=(await git(folder,['for-each-ref','--format=%(refname:short)','refs/heads'])).split('\n').map(name=>name.trim()).filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{sensitivity:'base'}));
  return {branch:current||'(detached HEAD)',branches};
}
export async function gitCheckout(folder,branch){
  if(typeof branch!=='string'||!/^[\w./-]+$/.test(branch)||branch.includes('..')||branch.startsWith('-')||branch.startsWith('/')||branch.endsWith('/')||branch.endsWith('.'))throw Error('Choose a branch.');
  const repo=await root(folder);
  const known=(await git(repo,['for-each-ref','--format=%(refname:short)','refs/heads'])).split('\n').map(name=>name.trim());
  if(!known.includes(branch))throw Error('Choose a local branch.');
  await git(repo,['checkout',branch]);
  return gitStatus(repo);
}
export async function gitDiff(folder,path,staged=false){
  const status=await gitStatus(folder),file=status.files.find(f=>f.path===path);if(!file)throw Error('Choose a changed file.');
  if(file.x==='?'&&!staged){
    const {readFile,lstat}=await import('node:fs/promises'),{join}=await import('node:path');const target=join(status.root,path),info=await lstat(target);
    if(!info.isFile()||info.size>500000)return {text:'',note:'Preview unavailable for this file type or size.'};
    const text=await readFile(target,'utf8');if(text.includes('\0'))return {text:'',note:'Binary file; preview unavailable.'};
    return {text:'@@ -0,0 +1,'+text.split('\n').length+' @@\n'+text.split('\n').map(line=>'+'+line).join('\n')};
  }
  const paths=[...(file.original?[file.original]:[]),path];
  const text=await git(status.root,['diff',...(staged?['--cached']:[]),'--no-ext-diff','--no-textconv','--unified=3','--',...paths]);
  return {text,note:text?'':'No textual changes (the file may have changed mode or be a submodule).'};
}
export async function gitChange(folder,{action,path,revision,message}){
  const repo=await root(folder),previous=locks.get(repo)||Promise.resolve();
  const next=previous.catch(()=>{}).then(async()=>{
    const status=await gitStatus(repo);if(status.revision!==revision)throw Error('Git changes have changed. Refresh before continuing.');
    if(action==='commit'){
      if(typeof message!=='string'||!message.trim()||message.length>10000)throw Error('Enter a commit message.');
      if(!status.files.some(f=>f.staged))throw Error('Stage changes before committing.');
      if(status.files.some(f=>f.conflict))throw Error('Resolve conflicts before committing.');
      await git(repo,['commit','-m',message.trim()]);
    }else{
      const file=status.files.find(f=>f.path===path);if(!file)throw Error('Choose a changed file.');
      if(file.conflict)throw Error('Resolve this conflict before staging it.');
      const paths=[...(file.original?[file.original]:[]),path];
      if(action==='stage')await git(repo,['add','--',...paths]);
      else if(action==='unstage'){
        const head=await git(repo,['rev-parse','--verify','HEAD']).catch(()=>null);
        if(head)await git(repo,['reset','-q','HEAD','--',...paths]);
        else await git(repo,['rm','--cached','--',...paths]);
      }else throw Error('Unsupported Git action.');
    }
    return gitStatus(repo);
  });locks.set(repo,next);try{return await next;}finally{if(locks.get(repo)===next)locks.delete(repo);}
}
export async function gitPush(folder){
  const repo=await root(folder),previous=locks.get(repo)||Promise.resolve();
  const next=previous.catch(()=>{}).then(async()=>{
    const status=await gitStatus(repo);
    const upstream=await git(repo,['rev-parse','--abbrev-ref','@{upstream}']).catch(()=>'');
    if(!upstream.trim())throw Error('This branch has no upstream to sync with.');
    if(!status.ahead)throw Error('Nothing to push.');
    if(status.behind)await git(repo,['pull','--ff-only'],{timeout:120000,...quietGit});
    await git(repo,['push'],{timeout:120000,...quietGit});
    return gitStatus(repo);
  });locks.set(repo,next);try{return await next;}finally{if(locks.get(repo)===next)locks.delete(repo);}
}
