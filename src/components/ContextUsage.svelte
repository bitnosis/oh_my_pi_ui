<script>
  import {tick} from 'svelte';
  import {workspace as w,api,rpc} from '../lib/workspace.svelte.js';
  let {onCostBreakdown=()=>{}}=$props();
  let dialog,open=$state(false),loading=$state(false),stats=$state(null),report=$state(''),note=$state(''),error=$state('');
  const usage=$derived(stats?.contextUsage||w.state.contextUsage);
  const number=value=>Number.isFinite(value)?Math.round(value).toLocaleString():'—';
  const rows=$derived(report.split('\n').flatMap(line=>{
    const match=line.match(/^\s{2}([A-Za-z][A-Za-z /-]*?)\s+\[.*?\].*?([\d,]+) tokens\s*$/);
    return match?[{label:match[1].trim(),tokens:Number(match[2].replaceAll(',',''))}]:[];
  }));
  async function load(){
    const id=w.active?.id;if(!id)return;
    loading=true;error='';stats=null;report='';note='';
    try{
      let result;
      try{result=await api('/api/context',{connectionId:id});}
      catch(e){if(!/Unknown workspace operation|404/.test(e.message))throw e;result={stats:await rpc('get_session_stats'),note:'Restart the workspace service to enable the detailed /context report.'};}
      if(w.active?.id!==id){dialog?.close();open=false;return;}
      stats=result.stats;report=result.report||'';note=result.note||'';
    }catch(e){error=e.message;}finally{loading=false;}
  }
  async function show(){open=true;await tick();dialog.showModal();await load();}
</script>

<button class="btn btn-ghost btn-xs ml-auto" title="View context usage breakdown" aria-label="View context usage breakdown" onclick={show}>Context {Math.round(w.state.contextUsage?.percent||0)}% <span aria-hidden="true">▴</span></button>
<dialog bind:this={dialog} class="modal context-modal" onclose={()=>{open=false;}}>
  {#if open}<div class="modal-box max-w-xl">
    <div class="flex items-center justify-between"><h2 class="text-xl font-semibold">Context usage</h2><button class="btn btn-ghost btn-sm" aria-label="Close context usage" onclick={()=>dialog.close()}>×</button></div>
    <p class="muted mt-1 text-xs">Current model context and OhMyPi’s native category report.</p>
    <div class="my-5"><div class="mb-2 flex justify-between text-sm"><strong>{number(usage?.tokens)} / {number(usage?.contextWindow)} tokens</strong><span>{usage?.percent?.toFixed(1)||'0'}%</span></div><progress class="progress progress-primary w-full" value={usage?.tokens||0} max={usage?.contextWindow||1}></progress></div>
    {#if loading}<p class="muted py-5 text-sm" role="status">Loading context details…</p>{:else if error}<p class="text-sm text-error" role="alert">{error}</p>{:else}
      {#if rows.length}<div class="grid gap-3">{#each rows as row}<div><div class="mb-1 flex justify-between gap-3 text-sm"><span>{row.label}</span><span class="font-mono text-xs">{number(row.tokens)} <span class="muted">tokens</span></span></div><progress class="progress h-1.5 w-full" value={row.tokens} max={usage?.contextWindow||1}></progress></div>{/each}</div>{/if}
      {#if note}<p class="muted my-3 text-sm">{note}</p>{/if}
      {#if report}<details class="mt-4 text-xs" open={!rows.length}><summary class="muted cursor-pointer">Native /context report</summary><pre class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-base-200 p-3">{report}</pre></details>{/if}
      {#if stats}<details class="mt-4 text-xs" open><summary class="muted cursor-pointer">Session activity & token totals</summary><dl class="mt-3 grid grid-cols-2 gap-2"><dt>User messages</dt><dd>{number(stats.userMessages)}</dd><dt>Assistant messages</dt><dd>{number(stats.assistantMessages)}</dd><dt>Tool calls</dt><dd>{number(stats.toolCalls)}</dd><dt>Input tokens</dt><dd>{number(stats.tokens?.input)}</dd><dt>Output tokens</dt><dd>{number(stats.tokens?.output)}</dd><dt>Cache read tokens</dt><dd>{number(stats.tokens?.cacheRead)}</dd></dl><p class="muted mt-3">These are accumulated usage totals, not a breakdown of the current context window.</p></details>{/if}
    {/if}
    <div class="modal-action"><button class="btn btn-sm" onclick={()=>{dialog.close();onCostBreakdown();}}>Cost Breakdown</button><button class="btn btn-ghost btn-sm" disabled={loading} onclick={load}>Refresh</button><button class="btn btn-primary btn-sm" onclick={()=>dialog.close()}>Done</button></div>
  </div>{/if}
</dialog>
