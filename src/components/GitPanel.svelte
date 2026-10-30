<script>
  import {workspace as w,api} from '../lib/workspace.svelte.js';
  let status=$state(null),selected=$state(null),diff=$state(''),note=$state(''),error=$state(''),busy=$state(false),message=$state(''),confirm=$state(false);
  async function load(){busy=true;error='';try{status=await api('/api/git/status',{folder:w.folder});selected=null;diff='';}catch(e){error=e.message;}finally{busy=false;}}
  async function select(file,staged){selected={...file,staged};error='';diff='';note='';try{const data=await api('/api/git/diff',{folder:w.folder,path:file.path,staged});diff=data.text;note=data.note||'';}catch(e){error=e.message;}}
  async function change(action,path){busy=true;error='';try{status=await api('/api/git/change',{folder:w.folder,action,path,revision:status.revision,message});selected=null;diff='';if(action==='commit'){message='';confirm=false;}}catch(e){error=e.message;}finally{busy=false;}}
  async function stageAll(){
    if(busy||!status)return;
    busy=true;error='';
    try{
      const folder=w.folder,paths=status.files.filter(file=>file.unstaged).map(file=>file.path);
      for(const path of paths)status=await api('/api/git/change',{folder,action:'stage',path,revision:status.revision});
      selected=null;diff='';note='';
    }catch(e){error=e.message;}finally{busy=false;}
  }
  const rows=$derived.by(()=>{
    const result=[];let left=0,right=0,deletes=[],adds=[],inHunk=false;
    function flush(){for(let i=0;i<Math.max(deletes.length,adds.length);i++)result.push({old:deletes[i],new:adds[i],kind:'change'});deletes=[];adds=[];}
    for(const line of diff.split('\n')){
      const h=line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if(h){flush();inHunk=true;left=Number(h[1]);right=Number(h[2]);result.push({header:line});}
      else if(!inHunk&&(line.startsWith('---')||line.startsWith('+++')||line.startsWith('diff ')||line.startsWith('index ')))continue;
      else if(line.startsWith('-'))deletes.push({number:left++,text:line.slice(1)});
      else if(line.startsWith('+'))adds.push({number:right++,text:line.slice(1)});
      else if(line.startsWith(' ')){flush();result.push({old:{number:left++,text:line.slice(1)},new:{number:right++,text:line.slice(1)}});}
      else if(line){flush();result.push({header:line});}
    }flush();return result;
  });
  load();
</script>
<div class="panel !max-w-none">
  <div class="panel-heading"><div><h2>Git</h2><p>{status?.branch||'Repository changes'} · {status?.root||w.folder}</p></div><div class="flex gap-2"><button class="btn btn-sm" onclick={()=>{w.view='worktrees';}}>Worktrees</button><button class="btn btn-sm" disabled={busy} onclick={load}>Refresh</button></div></div>
  {#if error}<p role="alert" class="mb-4 text-sm text-error">{error}</p>{/if}
  {#if status}<div class="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
    <aside class="min-w-0 space-y-5">
      {#each [true,false] as staged}<section><div class="mb-2 flex items-center justify-between gap-2"><h3 class="font-bold">{staged?'Staged':'Unstaged'} <span class="muted text-xs">({status.files.filter(f=>staged?f.staged:f.unstaged).length})</span></h3>{#if !staged}<button class="btn btn-ghost btn-xs" aria-label="Stage all files" title="Stage all unstaged files" disabled={busy||!status.files.some(f=>f.unstaged)||status.files.some(f=>f.conflict)} onclick={stageAll}>＋</button>{/if}</div>
        {#each status.files.filter(f=>staged?f.staged:f.unstaged) as file}<div class="mb-1 flex min-w-0 items-center gap-1 rounded-lg bg-base-200 p-1"><button class="min-w-0 flex-1 break-all rounded p-2 text-left text-xs" class:text-primary={selected?.path===file.path&&selected?.staged===staged} onclick={()=>select(file,staged)}><span class="mr-2 font-mono">{file.conflict?'!':staged?file.x:file.y}</span>{file.path}</button><button class="btn btn-ghost btn-xs" disabled={busy||file.conflict} aria-label={(staged?'Unstage ':'Stage ')+file.path} title={staged?'Unstage file':'Stage file'} onclick={()=>change(staged?'unstage':'stage',file.path)}>{staged?'−':'＋'}</button></div>{/each}
      </section>{/each}
      {#if !status.files.length}<p class="muted text-sm">Working tree clean.</p>{/if}
      <form onsubmit={e=>{e.preventDefault();confirm=true;}}><label class="text-xs font-semibold" for="git-commit-message">Commit message</label><textarea id="git-commit-message" class="textarea mt-2 w-full" placeholder="Describe your staged changes…" bind:value={message}></textarea><button class="btn btn-primary btn-sm mt-2 w-full" disabled={busy||!message.trim()||!status.files.some(f=>f.staged)||status.files.some(f=>f.conflict)}>Review commit</button></form>
    </aside>
    <section class="min-w-0 overflow-hidden rounded-lg border border-[var(--theme-border)]" aria-label="Split diff">
      <div class="border-b border-[var(--theme-border)] bg-base-200 p-3 text-sm font-semibold break-all">{selected?selected.path+' · '+(selected.staged?'Staged':'Unstaged'):'Select a file to view its diff'}</div>
      {#if note}<p class="muted p-4 text-sm">{note}</p>{/if}
      <div class="max-h-[70vh] overflow-auto"><table class="git-split w-full table-fixed font-mono text-xs"><thead><tr><th>Before</th><th>After</th></tr></thead><tbody>{#each rows as row}{#if row.header}<tr><td colspan="2" class="muted bg-base-200 p-2">{row.header}</td></tr>{:else}<tr><td class:git-removed={row.kind==='change'&&row.old}><span class="git-line">{row.old?.number||''}</span><span class="whitespace-pre-wrap break-all">{row.old?.text||''}</span></td><td class:git-added={row.kind==='change'&&row.new}><span class="git-line">{row.new?.number||''}</span><span class="whitespace-pre-wrap break-all">{row.new?.text||''}</span></td></tr>{/if}{/each}</tbody></table></div>
    </section>
  </div>{/if}
  {#if confirm}<div class="modal modal-open"><div class="modal-box"><h3 class="text-lg font-bold">Commit staged changes?</h3><p class="muted my-3 text-sm">{status.files.filter(f=>f.staged).length} staged files in {status.root}</p><pre class="whitespace-pre-wrap rounded bg-base-200 p-3 text-sm">{message}</pre><p class="muted mt-3 text-xs">Creates a local commit using your Git identity and hooks.</p><div class="modal-action"><button class="btn" disabled={busy} onclick={()=>{confirm=false;}}>Cancel</button><button class="btn btn-primary" disabled={busy} onclick={()=>change('commit')}>{busy?'Committing…':'Commit'}</button></div></div></div>{/if}
</div>
<style>
  .git-split th{padding:8px;text-align:left;background:var(--color-base-200)}
  .git-split td{vertical-align:top;border-right:1px solid var(--theme-border)}
  .git-line{display:inline-block;width:42px;padding:0 6px;text-align:right;color:var(--theme-muted);user-select:none}
  .git-removed{background:color-mix(in oklab,var(--color-error) 16%,transparent)}
  .git-added{background:color-mix(in oklab,var(--color-success) 16%,transparent)}
</style>
