<script>
  import {onMount} from 'svelte';
  import {api,attempt,workspace} from '../lib/workspace.svelte.js';
  let {dialog}=$props();
  let value=$state(''),answers=$state({}),custom=$state({});
  onMount(()=>{value=dialog.value||dialog.initialValue||'';});
  async function answer(fields){await attempt(()=>api('/api/answer',{connectionId:workspace.active.id,id:dialog.id,...fields}));}
  function select(question,label){const old=answers[question.id]||[];answers[question.id]=question.multi?(old.includes(label)?old.filter(x=>x!==label):[...old,label]):[label];}
</script>
<div class="modal modal-open" role="presentation"><div class="modal-box max-w-2xl">
  <span class="text-xs tracking-widest text-primary">OHMYPI NEEDS YOUR INPUT</span><h2 class="my-3 text-xl font-semibold">{dialog.title||'A question from your agent'}</h2>
  {#if dialog.message}<p class="mb-4 whitespace-pre-wrap">{dialog.message}</p>{/if}
  {#if dialog.method==='confirm'}<div class="modal-action"><button class="btn" onclick={()=>answer({confirmed:false})}>Decline</button><button class="btn btn-primary" onclick={()=>answer({confirmed:true})}>Approve</button></div>
  {:else if dialog.method==='select'}<div class="grid gap-2">{#each dialog.options||[] as option,i}<button class="btn h-auto justify-start py-3 text-left" onclick={()=>answer({value:option})}><span>{option}{#if dialog.optionDetails?.[i]?.description}<small class="muted block">{dialog.optionDetails[i].description}</small>{/if}</span></button>{/each}</div><button class="btn btn-ghost mt-4" onclick={()=>answer({cancelled:true})}>Cancel</button>
  {:else if dialog.method==='ask'}
    {#each dialog.questions||[] as question}<fieldset class="my-4"><legend class="mb-2 font-medium">{question.question}</legend><div class="grid gap-2">{#each question.options||[] as option}<label class="flex gap-3 rounded-box border border-[var(--theme-border)] p-3"><input class="checkbox checkbox-primary checkbox-sm mt-1" type="checkbox" checked={(answers[question.id]||[]).includes(option.label)} onchange={()=>select(question,option.label)}/><span>{option.label}{#if option.description}<small class="muted block">{option.description}</small>{/if}</span></label>{/each}<input class="input w-full" placeholder="Or type your own answer…" aria-label={'Custom answer for '+question.question} bind:value={custom[question.id]}/></div></fieldset>{/each}
    <div class="modal-action"><button class="btn btn-ghost" onclick={()=>answer({cancelled:true})}>Cancel</button><button class="btn btn-primary" onclick={()=>answer({answers:(dialog.questions||[]).map(q=>({id:q.id,selectedOptions:answers[q.id]||[],customInput:custom[q.id]||''}))})}>Send answers</button></div>
  {:else}
    <form onsubmit={e=>{e.preventDefault();answer({value});}}>{#if dialog.method==='editor'}<textarea class="textarea min-h-48 w-full font-mono" aria-label="Your answer" bind:value></textarea>{:else}<input class="input w-full" type={dialog.secret?'password':'text'} aria-label="Your answer" placeholder={dialog.placeholder||''} bind:value />{/if}<div class="modal-action"><button type="button" class="btn btn-ghost" onclick={()=>answer({cancelled:true})}>Cancel</button><button class="btn btn-primary">Submit</button></div></form>
  {/if}
</div></div>
