<script>
  import {workspace,attempt,rpc,api} from '../lib/workspace.svelte.js';
  import {agentsForModels,assigneesFor} from '../lib/model-agents.js';
  import AgentMarks from './AgentMarks.svelte';
  let models=$state([]),providers=$state([]),levels=$state([]),agents=$state([]),roles=$state({}),filter=$state(''),changing=$state(false);
  async function catalog(){if(!workspace.folder)return {agents:[],roles:{}};try{return await api('/api/agent-definitions',{folder:workspace.folder,profile:workspace.profile});}catch{return {agents:[],roles:{}};}}
  async function load(){await attempt(async()=>{const results=await Promise.all([rpc('get_available_models'),rpc('get_login_providers'),rpc('get_available_thinking_levels'),catalog()]);models=results[0].models||[];providers=results[1].providers||[];levels=results[2].levels||[];agents=results[3].agents||[];roles=results[3].roles||{};});}
  async function choose(model){changing=true;await attempt(async()=>{await rpc('set_model',{provider:model.provider,modelId:model.id});await load();});changing=false;}
  async function signOut(provider){
    await attempt(async()=>{
      const {accounts=[]}=await rpc('get_logout_accounts',{providerId:provider.id});
      const account=accounts.find(item=>item.active)||accounts[0];
      if(!account)throw new Error(`${provider.name} is signed in from outside saved accounts, so it can't be logged out here.`);
      await rpc('logout',{providerId:provider.id,credentialId:account.credentialId});
      await load();
    });
  }
  const listed=$derived([...models].filter(model=>(model.name+' '+model.id+' '+model.provider).toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>(a.name||a.id||'').localeCompare(b.name||b.id||'',undefined,{sensitivity:'base'})||(a.provider||'').localeCompare(b.provider||'',undefined,{sensitivity:'base'})||String(a.id||'').localeCompare(String(b.id||''))));
  const assigned=$derived(agentsForModels(models,agents,roles));
  const providerList=$derived([...providers].sort((a,b)=>(a.name||a.id||'').localeCompare(b.name||b.id||'',undefined,{sensitivity:'base'})||String(a.id||'').localeCompare(String(b.id||''))));
  load();
</script>
<div class="panel"><div class="panel-heading"><div><h2>Models & providers</h2><p>Use the models and accounts available to your OhMyPi profile.</p></div><button class="btn btn-sm" onclick={load}>Refresh</button></div>
  <div class="mb-6 rounded-box border border-[var(--theme-border)] bg-base-200 p-4"><p class="muted text-xs uppercase tracking-widest">Current model</p><strong class="mt-2 block">{workspace.state.model?.name||workspace.state.model?.id||'Default model'}</strong><span class="muted text-sm">{workspace.state.model?.provider}</span><div class="mt-4 flex flex-wrap items-center gap-3"><label class="text-sm" for="thinking">Reasoning</label><select id="thinking" class="select select-sm" value={workspace.state.thinkingLevel||'off'} onchange={e=>attempt(()=>rpc('set_thinking_level',{level:e.currentTarget.value}))}>{#each levels as level}<option value={level}>{level}</option>{/each}</select><label class="flex items-center gap-2 text-sm"><input class="toggle toggle-sm toggle-primary" type="checkbox" checked={workspace.state.fastModeEnabled||false} onchange={e=>attempt(()=>rpc('set_fast_mode',{enabled:e.currentTarget.checked}))}/>Fast mode</label>{#if workspace.state.slowModeSupported}<label class="flex items-center gap-2 text-sm"><input class="toggle toggle-sm" type="checkbox" checked={workspace.state.slowModeEnabled||false} onchange={e=>attempt(()=>rpc('set_slow_mode',{enabled:e.currentTarget.checked}))}/>Slow mode</label>{/if}</div></div>
  <input class="input mb-4 w-full" aria-label="Search models" placeholder="Search models or providers…" bind:value={filter}/>
  <div class="grid gap-3 md:grid-cols-2">{#each listed as model (model.provider+'/'+model.id)}<button class="card border border-[var(--theme-border)] bg-base-200 p-4 text-left hover:bg-base-300" disabled={changing||workspace.active?.busy} onclick={()=>choose(model)}><div class="flex items-center gap-2"><AgentMarks agents={assigneesFor(model,assigned)} /><strong class="min-w-0 flex-1 truncate text-sm">{model.name||model.id}</strong>{#if model.id===workspace.state.model?.id&&model.provider===workspace.state.model?.provider}<span class="badge badge-primary badge-sm shrink-0">Active</span>{/if}</div><span class="muted mt-2 text-xs">{model.provider} · {model.contextWindow?Intl.NumberFormat().format(model.contextWindow)+' context':''}{model.reasoning?' · Reasoning':''}</span></button>{/each}</div>
  <h3 class="mt-8 mb-4 text-lg font-semibold">Provider sign-in</h3><div class="grid gap-3">{#each providerList as provider (provider.id)}<div class="flex items-center justify-between rounded-box border border-[var(--theme-border)] p-4"><div><strong>{provider.name}</strong><span class="muted ml-3 text-sm">{provider.authenticated?'Signed in':'Not signed in'}</span></div>{#if provider.authenticated}<button class="btn btn-sm" disabled={workspace.active?.busy} onclick={()=>signOut(provider)}>Logout</button>{:else}<button class="btn btn-sm" disabled={!provider.available||workspace.active?.busy} onclick={()=>attempt(async()=>{await rpc('login',{providerId:provider.id});await load();})}>Sign in</button>{/if}</div>{/each}</div>
</div>
