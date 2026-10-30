<script>
  import {onMount,untrack} from 'svelte';
  import {workspace as w,api,attempt} from '../lib/workspace.svelte.js';
  let modes=$state({}),pending=$state(false),problem=$state('');
  const definitions=[
    ['extended','Ext','Extended context: allow larger context windows on supported models. This is a saved OhMyPi setting and may affect pricing.'],
    ['plan','Plan','Plan mode: have OhMyPi prepare a plan before implementation.'],
    ['vibe','Vibe','Vibe mode: coordinate persistent fast/good worker sessions with a read-only coordinator.'],
    ['loop','Loop','Loop mode: repeat the next prompt after each yield until stopped.'],
    ['fast','Fast','Fast mode: use the provider’s priority tier when supported; pricing may differ.'],
    ['slow','Slow','Slow mode: use a lower-priority provider tier when supported.'],
    ['skills','Skills','Include skill descriptions in the active session’s context.'],
    ['auto','Auto','Automatically compact the conversation as the context fills.'],
  ];
  const ready=$derived(Boolean(w.active?.ready&&!w.active?.closed));
  const selectedId=$derived(w.active?.id);
  async function load(id){
    if(!id||pending)return;
    try{const result=await api('/api/modes',{connectionId:id});if(w.active?.id===id){modes=result.modes;problem='';}}
    catch(e){if(w.active?.id===id)problem=/Unknown workspace operation/.test(e.message)?'Restart the workspace to enable header mode controls.':e.message;}
  }
  $effect(()=>{const id=selectedId;if(ready){modes={};problem='';untrack(()=>load(id));}else modes={};});
  onMount(()=>{const timer=setInterval(()=>{if(ready&&!w.active?.busy)load(w.active.id);},10000);return()=>clearInterval(timer);});
  async function toggle(key){
    const id=w.active?.id;if(!ready||pending||!modes[key]?.supported||typeof modes[key]?.enabled!=='boolean')return;
    pending=true;
    await attempt(async()=>{const result=await api('/api/modes/set',{connectionId:id,mode:key,enabled:!modes[key].enabled});if(w.active?.id===id)modes=result.modes;});
    pending=false;
  }
  function tooltip(key,description){
    if(!ready)return description+' Start or resume a session to use this control.';
    if(problem)return description+' '+problem;
    const mode=modes[key];
    return description+' '+(mode?.reason||(mode?.enabled===null?'Status unavailable.':mode?'Currently '+(mode.enabled?'on.':'off.'):'Loading status…'));
  }
</script>

<div class="header-modes" aria-label="OhMyPi modes">
  {#each definitions as [key,label,description]}
    <div class="tooltip tooltip-bottom" data-tip={tooltip(key,description)}>
      <button class="mode-toggle" class:mode-on={modes[key]?.enabled===true} aria-label={label+' mode'} aria-pressed={modes[key]?.enabled===true} disabled={!ready||pending||w.active?.busy||!modes[key]?.supported||typeof modes[key]?.enabled!=='boolean'} onclick={()=>toggle(key)}><span class="mode-indicator" aria-hidden="true">{modes[key]?.supported===false?'−':'●'}</span>{label}</button>
    </div>
  {/each}
</div>
