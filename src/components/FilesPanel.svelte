<script>
  import {api,attempt,workspace} from '../lib/workspace.svelte.js';
  let path=$state(''),files=$state([]),preview=$state(null);
  async function load(next=''){await attempt(async()=>{const result=await api('/api/files',{folder:workspace.folder,path:next});path=next;files=result.files;preview=null;});}
  async function open(file){if(file.directory)return load(file.path);await attempt(async()=>{preview=await api('/api/file',{folder:workspace.folder,path:file.path});});}
  load();
</script>
<div class="panel"><div class="panel-heading"><div><h2>Project files</h2><p class="break-all">{workspace.folder}</p></div><button class="btn btn-sm" onclick={()=>load(path)}>Refresh</button></div>
  <div class="mb-3 flex gap-2"><button class="btn btn-sm" onclick={()=>load('')}>Project root</button>{#if path}<button class="btn btn-sm" onclick={()=>load(path.split(/[\\/]/).slice(0,-1).join('/'))}>↑ Up</button>{/if}<span class="muted self-center text-sm">{path}</span></div>
  <div class="grid gap-4 lg:grid-cols-[250px_1fr]"><div class="rounded-box border border-[var(--theme-border)] p-2">{#each files as file}<button class="flex w-full gap-2 rounded-lg p-2 text-left text-sm hover:bg-base-300" onclick={()=>open(file)}><span class="text-primary">{file.directory?'▱':'·'}</span><span class="break-all">{file.name}</span></button>{/each}</div><div class="min-w-0 rounded-box border border-[var(--theme-border)] bg-base-200 p-4">{#if preview}<p class="muted mb-3 break-all font-mono text-xs">{preview.path}</p><pre class="max-h-[65vh] overflow-auto text-xs leading-relaxed">{preview.text}</pre>{:else}<p class="empty-note">Choose a file to preview it.</p>{/if}</div></div>
</div>
