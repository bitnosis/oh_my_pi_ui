<script>
  import {api,attempt,workspace} from '../lib/workspace.svelte.js';
  let settings=$state({}),search=$state(''),selected=$state(''),value=$state(''),loading=$state(true);
  async function load(){loading=true;await attempt(async()=>{settings=await api('/api/settings',{folder:workspace.folder||undefined,profile:workspace.profile});});loading=false;}
  function edit(key,entry){selected=key;value=entry.redacted?'':typeof entry.value==='string'?entry.value:JSON.stringify(entry.value);}
  async function save(reset=false){await attempt(async()=>{
    const setting=settings[selected];let parsed=value;
    if(!reset&&setting.type==='boolean'){if(!['true','false'].includes(value))throw new Error('Choose true or false.');parsed=value==='true';}
    else if(!reset&&['number','array','record','object'].includes(setting.type))parsed=JSON.parse(value);
    const result=await api('/api/settings/save',{folder:workspace.folder||undefined,profile:workspace.profile,key:selected,value:parsed,reset});
    await load();selected='';workspace.notice=result.message||'Setting saved.';
  });}
  load();
  const rows=$derived(Object.entries(settings).filter(([key,item])=>(key+' '+item.description).toLowerCase().includes(search.toLowerCase())));
</script>
<div class="panel"><div class="panel-heading"><div><h2>OhMyPi settings</h2><p>All registered settings, read from your installed version. Saves update the selected profile’s global settings.</p></div><button class="btn btn-sm" onclick={load}>Refresh</button></div>
  <div class="mb-4 flex items-center gap-3"><input class="input w-full" placeholder="Search settings…" aria-label="Search settings" bind:value={search}/><span class="badge badge-outline">{rows.length}</span></div>
  {#if loading}<span class="loading loading-spinner"></span>{/if}
  <div class="grid gap-2">{#each rows.slice(0,80) as [key,item]}<button class="rounded-box border border-[var(--theme-border)] bg-base-200 p-4 text-left hover:bg-base-300" onclick={()=>edit(key,item)}><div class="flex items-start justify-between gap-4"><strong class="break-all font-mono text-sm">{key}</strong><span class="badge badge-outline badge-sm">{item.type}</span></div><p class="muted mt-2 text-xs leading-relaxed">{item.description}</p><p class="mt-3 truncate font-mono text-xs text-primary">{item.redacted?'••••••••':JSON.stringify(item.value)}</p></button>{/each}</div>
  {#if rows.length>80}<p class="muted mt-4 text-sm">Showing the first 80 matches. Narrow your search to find a specific setting.</p>{/if}
  {#if selected}<div class="modal modal-open"><div class="modal-box"><h3 class="break-all font-mono font-semibold">{selected}</h3><p class="muted my-4 text-sm">{settings[selected].description}</p><form onsubmit={e=>{e.preventDefault();save();}}>{#if settings[selected].type==='boolean'}<select class="select w-full" aria-label="Setting value" bind:value><option value="true">true</option><option value="false">false</option></select>{:else if settings[selected].redacted}<input class="input w-full" type="password" aria-label="Setting value" placeholder="Enter a replacement credential" bind:value/>{:else}<textarea class="textarea min-h-32 w-full font-mono" aria-label="Setting value" bind:value></textarea>{/if}<p class="muted mt-3 text-xs">Changes are validated by OhMyPi. Some settings require restarting a session.</p><div class="modal-action"><button type="button" class="btn btn-ghost" onclick={()=>{selected='';}}>Cancel</button><button type="button" class="btn btn-outline" onclick={()=>save(true)}>Reset</button><button class="btn btn-primary">Save</button></div></form></div></div>{/if}
</div>
