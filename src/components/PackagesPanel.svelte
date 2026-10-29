<script>
  import {api,attempt,workspace} from '../lib/workspace.svelte.js';
  let kind=$state('plugin'),scope=$state('user'),target=$state(''),action=$state('install'),result=$state(null),output=$state(''),confirm=$state(false),loading=$state(false);
  async function load(){loading=true;await attempt(async()=>{result=await api('/api/packages',{kind,folder:workspace.folder||undefined,profile:workspace.profile});});loading=false;}
  async function change(){confirm=false;loading=true;await attempt(async()=>{const data=await api('/api/packages/change',{kind,scope,target,action,folder:workspace.folder||undefined,profile:workspace.profile});output=data.message;await load();});loading=false;}
  load();
  function inventory(value,group=''){
    if(!value)return [];
    if(Array.isArray(value))return value.flatMap(item=>typeof item==='string'?[{name:item,group}]:item&&typeof item==='object'?[{...item,name:item.name||item.id||item.spec||item.package||item.path||'Package',group}]:[]);
    if(typeof value==='object')return Object.entries(value).filter(([key])=>!['warnings','errors','config','settings'].includes(key)).flatMap(([key,item])=>inventory(item,key));
    return [];
  }
  const items=$derived(inventory(result));
</script>
<div class="panel"><div class="panel-heading"><div><h2>Plugins & skills</h2><p>Manage packages through your installed OhMyPi. Installed code can run with your account’s permissions.</p></div><button class="btn btn-sm" onclick={load}>Refresh</button></div>
  <div class="mb-5 flex flex-wrap gap-3"><select class="select" aria-label="Package type" bind:value={kind} onchange={()=>{action='install';load();}}><option value="plugin">Plugins</option><option value="skill">Skills</option></select><select class="select" aria-label="Package scope" bind:value={scope}><option value="user">User / profile</option><option value="project">Project</option></select></div>
  <form class="mb-6 flex flex-wrap gap-2" onsubmit={e=>{e.preventDefault();confirm=true;}}><input class="input min-w-48 flex-1" placeholder={kind==='plugin'?'Package spec or installed plugin name':'Skill spec or name'} aria-label="Package target" bind:value={target}/><select class="select" aria-label="Package action" bind:value={action}><option value="install">Install</option><option value="uninstall">Uninstall</option>{#if kind==='plugin'}<option value="enable">Enable</option><option value="disable">Disable</option>{:else}<option value="update">Update</option>{/if}</select><button class="btn btn-primary" disabled={!target.trim()||loading}>Apply</button></form>
  {#if loading}<span class="loading loading-spinner"></span>{/if}
  <h3 class="mb-3 font-semibold">Installed {kind==='plugin'?'plugins':'skills'}</h3>
  <div class="grid gap-3">{#each items as item}<div class="rounded-box border border-[var(--theme-border)] bg-base-200 p-4"><div class="flex items-center justify-between gap-3"><strong class="break-all text-sm">{typeof item.name==='string'?item.name:JSON.stringify(item.name)}</strong><span class="badge badge-outline badge-sm">{item.group}</span></div><p class="muted mt-2 text-xs">{item.description||item.version||item.source||''}</p><button class="btn btn-ghost btn-xs mt-2" onclick={()=>{target=typeof item.name==='string'?item.name:'';}}>Manage</button></div>{/each}{#if !loading&&!items.length}<p class="empty-note">No {kind==='plugin'?'plugins':'skills'} are installed in this profile.</p>{/if}</div>
  {#if result?.warnings?.length}<p class="muted mt-4 text-sm">{result.warnings.join('\n')}</p>{/if}
  {#if output}<h3 class="mt-6 mb-3 font-semibold">Last operation</h3><pre class="overflow-auto whitespace-pre-wrap text-xs">{output}</pre>{/if}
  {#if confirm}<div class="modal modal-open"><div class="modal-box"><h3 class="text-lg font-semibold">{action} {kind}</h3><p class="my-4 break-all font-mono">{target}</p><p class="muted text-sm">Scope: {scope}. {action==='install'?'Only install packages you trust. Packages may execute code on this computer.':'This changes the selected OhMyPi package.'}</p><div class="modal-action"><button class="btn btn-ghost" onclick={()=>{confirm=false;}}>Cancel</button><button class="btn btn-primary" onclick={change}>Confirm {action}</button></div></div></div>{/if}
</div>
