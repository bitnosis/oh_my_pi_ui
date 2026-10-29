<script>
  import {api,attempt,workspace,refresh} from '../lib/workspace.svelte.js';
  let {onclose}= $props();
  let path=$state(workspace.folder||workspace.overview.home||''),listing=$state({path:'',parent:'',folders:[]});
  async function browse(next=path){await attempt(async()=>{listing=await api('/api/folders',{path:next});path=listing.path;});}
  async function choose(){await attempt(async()=>{await api('/api/projects/add',{folder:path});workspace.folder=path;await refresh(true);onclose();});}
  browse();
</script>
<div class="modal modal-open"><div class="modal-box max-w-2xl">
  <h2 class="text-xl font-semibold">Add a project</h2><p class="muted mt-2 text-sm">Choose the folder where OhMyPi will work.</p>
  <form class="my-4 flex gap-2" onsubmit={e=>{e.preventDefault();browse();}}><input class="input w-full font-mono text-sm" aria-label="Folder path" bind:value={path}/><button class="btn">Go</button></form>
  <button class="btn btn-ghost btn-sm mb-2" onclick={()=>browse(listing.parent)}>↑ Parent folder</button>
  <div class="max-h-72 overflow-auto rounded-box border border-[var(--theme-border)] p-2">
    {#each listing.folders as folder}<button class="flex w-full gap-3 rounded-lg p-3 text-left hover:bg-base-300" onclick={()=>browse(folder.path)}>▱ <span>{folder.name}</span></button>{/each}
  </div>
  <div class="modal-action"><button class="btn btn-ghost" onclick={onclose}>Cancel</button><button class="btn btn-primary" onclick={choose}>Use this folder</button></div>
</div></div>
