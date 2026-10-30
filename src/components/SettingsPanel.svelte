<script>
  import {api,attempt,workspace} from '../lib/workspace.svelte.js';
  let settings=$state({}),search=$state(''),selected=$state(''),value=$state(''),loading=$state(true);
  let voiceSaving=$state(false),voiceLanguage=$state('en'),voiceModel=$state(''),voiceRoles=$state(null);
  async function loadVoice(){
    await attempt(async()=>{voiceRoles=await api('/api/agent-definitions/roles',{folder:workspace.folder,profile:workspace.profile,scope:'user'});const model=voiceRoles.roles.dictation;voiceModel=typeof model==='string'?model:'';});
  }
  async function saveVoiceSetting(key,value){
    voiceSaving=true;
    try{await attempt(async()=>{await api('/api/settings/save',{folder:workspace.folder||undefined,profile:workspace.profile,key,value});await load();workspace.notice='Voice setting saved. Start a new session if your current session does not pick up the change.';});}
    finally{voiceSaving=false;}
  }
  async function saveVoiceModel(){
    voiceSaving=true;
    try{await attempt(async()=>{if(!voiceRoles)throw new Error('Refresh voice settings first.');voiceRoles=await api('/api/agent-definitions/roles/save',{folder:workspace.folder,profile:workspace.profile,scope:'user',role:'dictation',model:voiceModel.trim()||null,revision:voiceRoles.revision});workspace.notice='Dictation model saved for this profile.';});}
    finally{voiceSaving=false;}
  }
  async function load(){loading=true;await attempt(async()=>{settings=await api('/api/settings',{folder:workspace.folder||undefined,profile:workspace.profile});voiceLanguage=settings['stt.language']?.value||'en';});loading=false;}
  function edit(key,entry){selected=key;value=entry.redacted?'':typeof entry.value==='string'?entry.value:JSON.stringify(entry.value);}
  async function save(reset=false){await attempt(async()=>{
    const setting=settings[selected];let parsed=value;
    if(!reset&&setting.type==='boolean'){if(!['true','false'].includes(value))throw new Error('Choose true or false.');parsed=value==='true';}
    else if(!reset&&['number','array','record','object'].includes(setting.type))parsed=JSON.parse(value);
    const result=await api('/api/settings/save',{folder:workspace.folder||undefined,profile:workspace.profile,key:selected,value:parsed,reset});
    await load();selected='';workspace.notice=result.message||'Setting saved.';
  });}
  load();
  if(workspace.folder)loadVoice();
  const rows=$derived(Object.entries(settings).filter(([key,item])=>(key+' '+item.description).toLowerCase().includes(search.toLowerCase())));
</script>
<div class="panel"><div class="panel-heading"><div><h2>OhMyPi settings</h2><p>All registered settings, read from your installed version. Saves update the selected profile’s global settings.</p></div><button class="btn btn-sm" onclick={load}>Refresh</button></div>
  <section class="mb-6 rounded-box border border-[var(--theme-border)] bg-base-200 p-4" aria-label="Voice input settings">
    <div class="flex items-center justify-between gap-4"><div><h3 class="font-bold">Voice input</h3><p class="muted mt-1 text-xs">Dictate using the microphone on the computer running OhMyPi.</p></div><label class="flex items-center gap-2 text-sm"><input type="checkbox" class="toggle toggle-primary" aria-label="Enable microphone dictation" checked={settings['stt.enabled']?.value===true} disabled={loading||voiceSaving||!settings['stt.enabled']} onchange={e=>saveVoiceSetting('stt.enabled',e.currentTarget.checked)}/>Enable</label></div>
    <div class="settings-split mt-4"><label class="text-sm">Language<div class="mt-1 flex gap-2"><input class="input input-sm w-full" aria-label="Dictation language" placeholder={settings['stt.language']?.value||'en'} bind:value={voiceLanguage}/><button class="btn btn-sm" disabled={voiceSaving||loading} onclick={()=>saveVoiceSetting('stt.language',voiceLanguage)}>Save</button></div></label><label class="text-sm">Dictation model<div class="mt-1 flex gap-2"><input class="input input-sm w-full" aria-label="Dictation model ID" placeholder="provider/model ID (blank uses inherited routing)" bind:value={voiceModel}/><button class="btn btn-sm" disabled={voiceSaving||!voiceRoles} onclick={saveVoiceModel}>Save</button></div></label></div>
    <p class="muted mt-3 text-xs">Use a speech-to-text model supported by OhMyPi’s @dictation role. Local models must be installed through OhMyPi’s speech setup. Project settings can override this profile. On Windows, allow desktop apps to access the microphone under Settings → Privacy &amp; security → Microphone.</p>
    <p class="muted mt-2 text-xs">After updating this app, restart the workspace service to load voice support. Hover over the center menu button, click the microphone to record, then click stop to send.</p>
  </section>
  <div class="mb-4 flex items-center gap-3"><input class="input w-full" placeholder="Search settings…" aria-label="Search settings" bind:value={search}/><span class="badge badge-outline">{rows.length}</span></div>
  {#if loading}<span class="loading loading-spinner"></span>{/if}
  <div class="settings-list">{#each rows.slice(0,80) as [key,item]}<button class="min-w-0 rounded-box border border-[var(--theme-border)] bg-base-200 p-4 text-left hover:bg-base-300" onclick={()=>edit(key,item)}><div class="flex items-start justify-between gap-4"><strong class="min-w-0 flex-1 break-all font-mono text-sm">{key}</strong><span class="badge badge-outline badge-sm">{item.type}</span></div><p class="muted mt-2 text-xs leading-relaxed">{item.description}</p><p class="mt-3 truncate font-mono text-xs text-primary">{item.redacted?'••••••••':JSON.stringify(item.value)}</p></button>{/each}</div>
  {#if rows.length>80}<p class="muted mt-4 text-sm">Showing the first 80 matches. Narrow your search to find a specific setting.</p>{/if}
<style>
  .settings-split,
  .settings-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
  }
  .settings-split label,
  .settings-list > button {
    min-width: 0;
  }
  @media (max-width: 700px) {
    .settings-split,
    .settings-list {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
  {#if selected}<div class="modal modal-open"><div class="modal-box"><h3 class="break-all font-mono font-semibold">{selected}</h3><p class="muted my-4 text-sm">{settings[selected].description}</p><form onsubmit={e=>{e.preventDefault();save();}}>{#if settings[selected].type==='boolean'}<select class="select w-full" aria-label="Setting value" bind:value><option value="true">true</option><option value="false">false</option></select>{:else if settings[selected].redacted}<input class="input w-full" type="password" aria-label="Setting value" placeholder="Enter a replacement credential" bind:value/>{:else}<textarea class="textarea min-h-32 w-full font-mono" aria-label="Setting value" bind:value></textarea>{/if}<p class="muted mt-3 text-xs">Changes are validated by OhMyPi. Some settings require restarting a session.</p><div class="modal-action"><button type="button" class="btn btn-ghost" onclick={()=>{selected='';}}>Cancel</button><button type="button" class="btn btn-outline" onclick={()=>save(true)}>Reset</button><button class="btn btn-primary">Save</button></div></form></div></div>{/if}
</div>

