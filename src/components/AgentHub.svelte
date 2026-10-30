<script>
  import {onMount} from 'svelte';
  import {workspace,attempt,rpc} from '../lib/workspace.svelte.js';
  import {messageText} from '../lib/conversation.js';
  import AgentDefinitions from './AgentDefinitions.svelte';
  let agents=$state([]),selected=$state(null),messages=$state([]),message=$state('');
  async function load(){if(!workspace.active?.ready||workspace.active.closed){agents=[];return;}const data=await rpc('get_subagents');agents=data.subagents||[];}
  async function inspect(agent){selected=agent;await attempt(async()=>{const result=await rpc('get_subagent_messages',{subagentId:agent.id});messages=result.messages||[];});}
  onMount(()=>{attempt(load);const timer=setInterval(()=>load().catch(()=>{}),5000);return()=>clearInterval(timer);});
</script>
<div class="panel">
  <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
  <div class="min-w-0"><AgentDefinitions/></div>
  <section class="live-agents-inset min-w-0" aria-label="Live agents and session tasks">
  <div class="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 class="text-lg font-semibold">Live agents</h3><button class="btn btn-sm" onclick={()=>attempt(load)}>Refresh live agents</button></div>
  {#if !agents.length}<div class="empty-note">No subagents yet. Ask OhMyPi to delegate a task in the conversation; agents will appear here as they start.</div>{/if}
  <div class="grid gap-3">{#each agents as agent}<button class="card min-w-0 break-words border border-[var(--theme-border)] bg-base-200 p-4 text-left" onclick={()=>inspect(agent)}><div class="flex justify-between gap-2"><strong>{agent.agent||agent.id}</strong><span class="badge badge-outline badge-sm">{agent.status}</span></div><p class="muted my-3 text-sm">{agent.task||agent.assignment||agent.description||'Agent task'}</p><small class="muted">{agent.id}</small></button>{/each}</div>
  {#if selected}<div class="mt-5 rounded-box border border-[var(--theme-border)] p-4"><div class="flex items-center justify-between gap-3"><h3 class="font-semibold">{selected.agent||selected.id}</h3><button class="btn btn-sm" onclick={()=>inspect(selected)}>Reload transcript</button></div><div class="my-4 max-h-96 overflow-auto">{#each messages as item}<div class="mb-4"><small class="text-primary">{item.role}</small><p class="whitespace-pre-wrap text-sm">{messageText(item)}</p></div>{/each}</div><form class="flex gap-2" onsubmit={e=>{e.preventDefault();attempt(async()=>{await rpc('steer_subagent',{subagentId:selected.id,message});message='';await load();});}}><input class="input w-full" aria-label="Message subagent" placeholder="Steer this agent…" bind:value={message}/><button class="btn btn-primary" disabled={!message.trim()}>Send</button><button type="button" class="btn btn-outline" onclick={()=>attempt(async()=>{await rpc('cancel_subagent',{subagentId:selected.id});await load();})}>Stop agent</button></form></div>{/if}
  <div class="mt-8"><h3 class="font-semibold">Session tasks</h3>{#each workspace.state.todoPhases||[] as phase}<h4 class="muted mt-4 text-sm">{phase.name}</h4>{#each phase.tasks||[] as task}<p class="mt-2 text-sm"><span class="mr-2 text-primary">{task.status==='completed'?'✓':task.status==='in_progress'?'◉':'○'}</span>{task.content}</p>{/each}{/each}</div>
  </section>
  </div>
</div>
