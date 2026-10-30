<script>
  import {tick} from 'svelte';
  import {currentCatalog,refreshCatalog,invalidateCatalog} from '../lib/catalog.svelte.js';
  import {workspace,attempt,rpc,api} from '../lib/workspace.svelte.js';
  import {agentsForModels,assigneesFor,rolesForModels} from '../lib/model-agents.js';
  import AgentMarks from './AgentMarks.svelte';
  import AgentSprite from './AgentSprite.svelte';
  import AgentIcon from './AgentIcon.svelte';
  import {agentColor} from '../lib/agent-appearance.svelte.js';
  const selectionInk=name=>{
    const hex=agentColor(name);if(!hex)return 'var(--color-primary-content)';
    const rgb=hex.slice(1).match(/../g).map(channel=>parseInt(channel,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#111111':'#ffffff';
  };
  import ModelLogo from './ModelLogo.svelte';
  import RoleIcon from './RoleIcon.svelte';
  import NeuralLoader from './NeuralLoader.svelte';
  let loading=$state(true),refreshing=$state(false);
  const cached=$derived(currentCatalog());
  const models=$derived(cached.models),providers=$derived(cached.providers),levels=$derived(cached.levels),agents=$derived(cached.agents),roles=$derived(cached.roles);
  let filter=$state(''),changing=$state(false);
  let assignmentDialog,assignmentModel=$state(null),assignmentScope=$state('user'),assignmentRows=$state([]),assignmentBusy=$state(false),assigning=$state({}),assignmentError=$state('');
  let roleDialog,roleModel=$state(null),roleScope=$state('user'),roleState=$state(null),roleBusy=$state(false),roleError=$state(''),customRole=$state('');
  const builtInRoles=['default','smol','slow','vision','plan','commit','tiny','memory','task','advisor','widget','image','web','speech','dictation','judge'];
  const roleNames=$derived([...new Set([...builtInRoles,...Object.keys(roles),...Object.keys(roleState?.roles||{})])]);
  const roleAssignments=$derived(rolesForModels(models,roles));
  async function loadRoleSettings(){
    roleBusy=true;roleError='';roleState=null;
    try{roleState=await api('/api/agent-definitions/roles',{folder:workspace.folder,profile:workspace.profile,scope:roleScope});}
    catch(e){roleError=e.message;}finally{roleBusy=false;}
  }
  async function openRoles(model){roleModel=model;customRole='';await tick();roleDialog.showModal();await loadRoleSettings();}
  async function setRole(role,enabled){
    if(roleBusy||!roleState)return;roleBusy=true;roleError='';
    try{
      roleState=await api('/api/agent-definitions/roles/save',{folder:workspace.folder,profile:workspace.profile,scope:roleScope,role,model:enabled?roleModel.provider+'/'+roleModel.id:null,revision:roleState.revision});
      customRole='';await catalog();
    }catch(e){roleError=e.message;}finally{roleBusy=false;}
  }
  const active=model=>model.id===workspace.state.model?.id&&model.provider===workspace.state.model?.provider;
  async function assignmentList(){
    assignmentBusy=true;assignmentError='';assignmentRows=[];
    try{assignmentRows=await Promise.all(agents.map(async agent=>({...agent,settings:await api('/api/agent-definitions/settings',{folder:workspace.folder,profile:workspace.profile,scope:assignmentScope,name:agent.name})})));}
    catch(e){assignmentError=e.message;}finally{assignmentBusy=false;}
  }
  async function openAssignments(model){assignmentModel=model;await tick();assignmentDialog.showModal();await assignmentList();}
  async function assign(agent,enabled){
    if(assigning[agent.name])return;
    assigning[agent.name]=true;assignmentError='';
    const selector=assignmentModel.provider+'/'+assignmentModel.id;
    const previous=agent.settings.values.model??null;
    agent.settings.values.model=enabled?selector:null;
    try{
      await api('/api/agent-definitions/settings/save',{folder:workspace.folder,profile:workspace.profile,scope:assignmentScope,name:agent.name,revision:agent.settings.revision,values:{...agent.settings.values,model:agent.settings.values.model}});
      agent.settings=await api('/api/agent-definitions/settings',{folder:workspace.folder,profile:workspace.profile,scope:assignmentScope,name:agent.name});
      catalog();
    }catch(e){agent.settings.values.model=previous;assignmentError=e.message;}finally{delete assigning[agent.name];}
  }
  async function catalog(){invalidateCatalog();return refreshCatalog({force:true,resources:['definitions']});}
  async function load(force=false,showAnimation=false){loading=true;if(showAnimation)refreshing=true;try{await attempt(()=>refreshCatalog({force,resources:['models','definitions','providers','levels']}));}finally{loading=false;if(showAnimation)refreshing=false;}}
  async function refreshAuthentication(){invalidateCatalog('models');invalidateCatalog('providers');await load(true);}
  async function choose(model){changing=true;await attempt(async()=>{await rpc('set_model',{provider:model.provider,modelId:model.id});});changing=false;}
  async function signOut(provider){
    await attempt(async()=>{
      const {accounts=[]}=await rpc('get_logout_accounts',{providerId:provider.id});
      const account=accounts.find(item=>item.active)||accounts[0];
      if(!account)throw new Error(`${provider.name} is signed in from outside saved accounts, so it can't be logged out here.`);
      await rpc('logout',{providerId:provider.id,credentialId:account.credentialId});
      await refreshAuthentication();
    });
  }
  const listed=$derived([...models].filter(model=>(model.name+' '+model.id+' '+model.provider).toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>(a.name||a.id||'').localeCompare(b.name||b.id||'',undefined,{sensitivity:'base'})||(a.provider||'').localeCompare(b.provider||'',undefined,{sensitivity:'base'})||String(a.id||'').localeCompare(String(b.id||''))));
  const assigned=$derived(agentsForModels(models,agents,roles));
  const providerList=$derived([...providers].sort((a,b)=>(a.name||a.id||'').localeCompare(b.name||b.id||'',undefined,{sensitivity:'base'})||String(a.id||'').localeCompare(String(b.id||''))));
  load();
</script>
<div class="panel"><div class="panel-heading"><div><h2>Models & providers</h2><p>Use the models and accounts available to your OhMyPi profile.</p></div><button class="btn btn-sm" disabled={loading} onclick={()=>load(true,true)}>Refresh</button></div>
  {#if refreshing}<NeuralLoader/>{:else}
  <div class="mb-6 rounded-box border border-[var(--theme-border)] bg-base-200 p-4"><div class="current-model-heading"><div class="min-w-0"><p class="muted text-xs uppercase tracking-widest">Current model</p><strong class="mt-2 block">{workspace.state.model?.name||workspace.state.model?.id||'Default model'}</strong><span class="muted text-sm">{workspace.state.model?.provider}</span></div><div class="current-model-assignments" aria-label="Current model assignments"><div class="current-model-chip-row"><button type="button" class="btn btn-ghost btn-xs shrink-0 gap-1 tooltip tooltip-top" data-tip="Assign or unassign agents" aria-label="Assign agents to current model" disabled={!workspace.state.model||!workspace.folder} onclick={()=>openAssignments(workspace.state.model)}><AgentIcon/> Agents</button>{#if workspace.state.model&&assigneesFor(workspace.state.model,assigned).length}<AgentMarks agents={assigneesFor(workspace.state.model,assigned)}/>{:else}<span class="muted text-xs">None</span>{/if}</div><div class="current-model-chip-row"><button type="button" class="btn btn-ghost btn-xs shrink-0 gap-1 tooltip tooltip-top" data-tip="Assign or unassign model roles" aria-label="Assign roles to current model" disabled={!workspace.state.model||!workspace.folder} onclick={()=>openRoles(workspace.state.model)}><RoleIcon/> Roles</button>{#if workspace.state.model&&assigneesFor(workspace.state.model,roleAssignments).length}{#each assigneesFor(workspace.state.model,roleAssignments) as role}<span class="badge badge-outline badge-xs normal-case" title={'@'+role.name}>@{role.name.toLowerCase()}</span>{/each}{:else}<span class="muted text-xs">None assigned</span>{/if}</div></div></div><div class="mt-4 flex flex-wrap items-center gap-3"><label class="text-sm" for="thinking">Reasoning</label><select id="thinking" class="select select-sm" value={workspace.state.thinkingLevel||'off'} onchange={e=>attempt(()=>rpc('set_thinking_level',{level:e.currentTarget.value}))}>{#each levels as level}<option value={level}>{level}</option>{/each}</select><label class="flex items-center gap-2 text-sm"><input class="toggle toggle-sm toggle-primary" type="checkbox" checked={workspace.state.fastModeEnabled||false} onchange={e=>attempt(()=>rpc('set_fast_mode',{enabled:e.currentTarget.checked}))}/>Fast mode</label>{#if workspace.state.slowModeSupported}<label class="flex items-center gap-2 text-sm"><input class="toggle toggle-sm" type="checkbox" checked={workspace.state.slowModeEnabled||false} onchange={e=>attempt(()=>rpc('set_slow_mode',{enabled:e.currentTarget.checked}))}/>Slow mode</label>{/if}</div></div>
  <input class="input mb-4 w-full" aria-label="Search models" placeholder="Search models or providers…" bind:value={filter}/>
  <div class="grid gap-3 md:grid-cols-2">{#each listed as model (model.provider+'/'+model.id)}<article class="card min-w-0 border border-[var(--theme-border)] bg-base-200 p-4 text-left" class:model-active={active(model)}>
    <div class="flex items-center gap-2"><ModelLogo {model}/><strong class="min-w-0 flex-1 truncate text-sm">{model.name||model.id}</strong><input type="checkbox" class="toggle toggle-sm toggle-primary shrink-0" aria-label={'Use '+(model.name||model.id)+' as active model'} checked={active(model)} disabled={changing||workspace.active?.busy} onclick={e=>{if(active(model))e.preventDefault();}} onchange={()=>choose(model)}/></div>
    <span class="muted mt-2 text-xs">{model.provider} · {model.contextWindow?Intl.NumberFormat().format(model.contextWindow)+' context':''}{model.reasoning?' · Reasoning':''}</span>
    <div class="mt-3 flex items-center justify-between gap-3 border-t border-[var(--theme-border)] pt-2">
      <div class="flex min-w-0 flex-1 items-center gap-1"><button class="btn btn-ghost btn-xs shrink-0 tooltip tooltip-top" data-tip="Assign or unassign agents" aria-label={'Assign agents to '+(model.name||model.id)} title="Assign or unassign agents" onclick={()=>openAssignments(model)}><AgentIcon/></button><AgentMarks agents={assigneesFor(model,assigned)} size={40}/></div>
      <div class="flex min-w-0 flex-1 items-center justify-end gap-1"><div class="flex flex-wrap justify-end gap-1">{#each assigneesFor(model,roleAssignments) as role}<span class="badge badge-outline badge-xs normal-case" title={'@'+role.name+(role.fallback?' (fallback)':'')}>@{role.name.toLowerCase()}</span>{/each}</div><button class="btn btn-ghost btn-xs shrink-0 tooltip tooltip-top" data-tip="Assign model roles such as @smol and @task" aria-label={'Assign roles to '+(model.name||model.id)} title="Assign or unassign model roles" onclick={()=>openRoles(model)}><RoleIcon/></button></div>
    </div>
  </article>{/each}</div>
  <h3 class="mt-8 mb-4 text-lg font-semibold">Provider sign-in</h3><div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{#each providerList as provider (provider.id)}<div class="provider-card flex min-w-0 flex-col items-start gap-3 rounded-box border border-[var(--theme-border)] p-3"><div class="min-w-0"><strong class="block break-words text-sm">{provider.name}</strong><span class="muted mt-1 block text-xs">{provider.authenticated?'Signed in':'Not signed in'}</span></div>{#if provider.authenticated}<button class="provider-logout btn btn-xs mt-auto" disabled={workspace.active?.busy} onclick={()=>signOut(provider)}>Logout</button>{:else}<button class="btn btn-xs mt-auto" disabled={!provider.available||workspace.active?.busy} onclick={()=>attempt(async()=>{await rpc('login',{providerId:provider.id});await refreshAuthentication();})}>Sign in</button>{/if}</div>{/each}</div>
  {/if}
</div>
<dialog bind:this={assignmentDialog} class="modal context-modal" onclose={()=>{assignmentModel=null;}}>
  {#if assignmentModel}<div class="modal-box max-w-lg"><div class="flex items-center justify-between gap-3"><h2 class="text-lg font-bold">Assign agents</h2><button class="btn btn-ghost btn-sm" aria-label="Close agent assignments" disabled={assignmentBusy} onclick={()=>assignmentDialog.close()}>×</button></div><p class="mt-2 text-sm">{assignmentModel.name||assignmentModel.id}</p>
    <label class="mt-4 block text-xs" for="model-assignment-scope">Save assignments in</label><select id="model-assignment-scope" class="select select-sm mt-1 w-full" disabled={assignmentBusy} bind:value={assignmentScope} onchange={assignmentList}><option value="user">Selected profile</option><option value="project">This project</option></select>
    <p class="muted my-4 text-xs">Check an agent to use this model for future launches. Unchecking clears its model override in this scope and restores its inherited routing. Project settings take precedence over profile settings.</p>
    {#if assignmentError}<p role="alert" class="mb-3 text-sm text-error">{assignmentError}</p>{/if}
    {#if assignmentBusy && !assignmentRows.length}<p role="status" class="muted mb-3 text-xs">Loading agents…</p>{/if}
    <div class="max-h-80 space-y-2 overflow-y-auto">{#each assignmentRows as agent (agent.name)}<label class="flex items-center gap-3 rounded-lg bg-base-200 p-3"><input class="checkbox checkbox-primary checkbox-sm" style:--input-color={agentColor(agent.name)||'var(--color-primary)'} style:color={selectionInk(agent.name)} type="checkbox" checked={agent.settings.values.model===assignmentModel.provider+'/'+assignmentModel.id} disabled={assigning[agent.name]} onchange={e=>assign(agent,e.currentTarget.checked)}/><AgentSprite name={agent.name} size={40}/><span class="min-w-0"><strong class="block text-sm uppercase">{agent.name}</strong><span class="muted block text-xs">{agent.enabled?'Enabled':'Disabled'} · {agent.settings.values.model||'Inherited routing'}</span></span></label>{/each}</div>
    <div class="modal-action"><button class="btn btn-sm" onclick={()=>assignmentDialog.close()}>Done</button></div>
  </div>{/if}
</dialog>
<dialog bind:this={roleDialog} class="modal context-modal" onclose={()=>{roleModel=null;}}>
  {#if roleModel}<div class="modal-box max-w-lg"><div class="flex items-center justify-between gap-3"><h2 class="text-lg font-bold">Model roles</h2><button class="btn btn-ghost btn-sm" aria-label="Close model roles" disabled={roleBusy} onclick={()=>roleDialog.close()}>×</button></div><p class="mt-2 text-sm">{roleModel.name||roleModel.id}</p>
    <label class="mt-4 block text-xs" for="model-role-scope">Save role assignments in</label><select id="model-role-scope" class="select select-sm mt-1 w-full" disabled={roleBusy} bind:value={roleScope} onchange={loadRoleSettings}><option value="user">Selected profile</option><option value="project">This project</option></select>
    <p class="muted my-4 text-xs">Assign this model to @smol, @task, @vision and other roles. Unchecking removes this scope’s override and restores inherited routing. Changes apply to future launches; existing sessions may need restarting.</p>
    {#if roleError}<p role="alert" class="mb-3 text-sm text-error">{roleError}</p>{/if}
    {#if roleBusy}<p role="status" class="muted mb-3 text-xs">Updating model roles…</p>{/if}
    {#if roleState}<div class="grid max-h-80 grid-cols-2 gap-2 overflow-auto">{#each roleNames as role}<label class="flex min-w-0 items-start gap-2 rounded-lg bg-base-200 p-3"><input type="checkbox" class="checkbox checkbox-primary checkbox-sm" disabled={roleBusy} checked={roleState.roles[role]===roleModel.provider+'/'+roleModel.id} onchange={e=>setRole(role,e.currentTarget.checked)}/><span class="min-w-0"><strong class="block break-all text-xs normal-case">@{role.toLowerCase()}</strong><span class="muted mt-1 block break-all text-[10px]">{typeof roleState.roles[role]==='string'?roleState.roles[role]:'Native default / inherited'}</span></span></label>{/each}</div>
    <form class="mt-4 flex gap-2" onsubmit={e=>{e.preventDefault();setRole(customRole.trim().toLowerCase(),true);}}><input class="input input-sm min-w-0 flex-1" aria-label="Custom model role" placeholder="Custom role name…" pattern="[a-zA-Z][a-zA-Z0-9_-]*" bind:value={customRole}/><button class="btn btn-sm" disabled={roleBusy||!customRole.trim()}>Add role</button></form>{/if}
    <div class="modal-action"><button class="btn btn-sm" disabled={roleBusy} onclick={()=>roleDialog.close()}>Done</button></div>
  </div>{/if}
</dialog>
<style>
  .current-model-heading{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:16px;align-items:start}
  .current-model-assignments{min-width:0;display:flex;flex-direction:column;gap:8px}
  .current-model-chip-row{display:flex;align-items:center;justify-content:safe flex-end;gap:8px;white-space:nowrap;overflow-x:auto;min-width:0;scrollbar-width:none}
  .current-model-chip-row::-webkit-scrollbar{display:none}
  .current-model-assignments :global(.model-assignees){max-width:none;flex-wrap:nowrap;flex-shrink:0}
  .current-model-assignments :global(.badge){flex-shrink:0}
  @media(max-width:640px){.current-model-heading{grid-template-columns:minmax(0,1fr)}.current-model-chip-row{justify-content:flex-start}} 
  .model-active{border-color:var(--color-primary);background:color-mix(in oklab,var(--color-primary) 12%,var(--color-base-200));box-shadow:0 0 0 1px color-mix(in oklab,var(--color-primary) 35%,transparent)}
  .model-active strong{color:var(--color-primary)}
  .provider-card{background:color-mix(in oklab,color-mix(in oklab,var(--color-base-200) 94%,white) 85%,transparent);box-shadow:inset 0 2px 6px rgb(0 0 0 / .25),inset 0 8px 16px rgb(0 0 0 / .08),inset 0 -1px 0 color-mix(in oklab,var(--color-base-content) 7%,transparent)}
  .provider-logout{background:#dc2626;border-color:#dc2626;color:#fff}
  .provider-logout:hover:not(:disabled){background:#b91c1c;border-color:#b91c1c}
</style>
















