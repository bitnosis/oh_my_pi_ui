<script>
  import {api,attempt,workspace,refresh,startSession} from '../lib/workspace.svelte.js';
  let trees=$state([]),branch=$state(''),confirm=$state(null),loading=$state(true);
  async function load(){loading=true;await attempt(async()=>{trees=(await api('/api/worktrees',{folder:workspace.folder})).worktrees;});loading=false;}
  async function create(event){event.preventDefault();await attempt(async()=>{const tree=await api('/api/worktrees/add',{folder:workspace.folder,branch});branch='';await refresh(true);await load();workspace.notice='Created '+tree.path;});}
  load();
</script>
<div class="panel"><div class="panel-heading"><div><h2>Git worktrees</h2><p>Separate working folders for branches and parallel sessions.</p></div><button class="btn btn-sm" onclick={load}>Refresh</button></div>
  <form class="mb-6 flex gap-2" onsubmit={create}><input class="input w-full" placeholder="New branch name, e.g. feature/new-dashboard" aria-label="New worktree branch" bind:value={branch}/><button class="btn btn-primary" disabled={!branch.trim()}>Create worktree</button></form>
  {#if loading}<span class="loading loading-spinner"></span>{/if}
  {#each trees as tree,i}<div class="mb-3 rounded-box border border-[var(--theme-border)] bg-base-200 p-4"><div class="flex flex-wrap items-center justify-between gap-3"><strong>{tree.branch||'Detached HEAD'}</strong><div class="flex gap-2"><button class="btn btn-sm" onclick={()=>attempt(()=>startSession({folder:tree.path}))}>Start session here</button>{#if i>0}<button class="btn btn-sm btn-outline" onclick={()=>{confirm=tree;}}>Remove</button>{/if}</div></div><p class="muted mt-3 break-all font-mono text-xs">{tree.path}</p><small class="muted">{tree.head?.slice(0,12)}</small></div>{/each}
  {#if confirm}<div class="modal modal-open"><div class="modal-box"><h3 class="text-lg font-semibold">Remove worktree?</h3><p class="my-4 break-all">{confirm.path}</p><p class="muted text-sm">Git will refuse if this worktree has uncommitted changes. The branch is kept.</p><div class="modal-action"><button class="btn btn-ghost" onclick={()=>{confirm=null;}}>Cancel</button><button class="btn btn-primary" onclick={()=>attempt(async()=>{await api('/api/worktrees/remove',{folder:workspace.folder,path:confirm.path});confirm=null;await load();})}>Remove worktree</button></div></div></div>{/if}
</div>
