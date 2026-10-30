<script>
  import {tick} from 'svelte';
  import {workspace as w,api} from '../lib/workspace.svelte.js';
  let dialog,open=$state(false),url=$state(''),error=$state(''),loading=$state(false),sessionId=$state('');
  export async function show(){
    if(!w.active?.ready||w.active.closed)return;
    const id=w.active.id;sessionId=id;open=true;url='';error='';loading=true;
    await tick();dialog.showModal();
    try{const result=await api('/api/trace-dashboard',{connectionId:id});if(w.active?.id===id&&open)url=result.url;else dialog.close();}
    catch(e){error=/Unknown workspace operation|404/.test(e.message)?'Restart the workspace service to enable the cost dashboard.':e.message;}
    finally{loading=false;}
  }
  $effect(()=>{if(open&&(w.active?.id!==sessionId||w.active?.closed))dialog?.close();});
</script>
<dialog bind:this={dialog} class="modal context-modal" onclose={()=>{open=false;url='';}}>
  {#if open}<div class="modal-box flex h-[94dvh] w-[96vw] max-w-none flex-col overflow-hidden p-0">
    <div class="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--theme-border)] px-5 py-3"><div><h2 class="text-lg font-semibold">Cost Breakdown</h2><p class="muted text-xs">OhMyPi’s native trace and usage dashboard · {w.state.sessionName||w.active?.name||'Current session'}</p></div><button class="btn btn-ghost btn-sm" aria-label="Close cost breakdown" onclick={()=>dialog.close()}>×</button></div>
    {#if error}<div class="p-6"><p class="text-error" role="alert">{error}</p><button class="btn btn-sm mt-4" onclick={show}>Retry</button></div>
    {:else if !url}<p class="muted p-6" role="status">{loading?'Opening OhMyPi trace dashboard…':'Dashboard unavailable.'}</p>
    {:else}<iframe class="min-h-0 w-full flex-1 border-0 bg-base-100" title="OhMyPi cost and trace dashboard" src={url} sandbox="allow-scripts allow-same-origin allow-downloads" onload={()=>{loading=false;}}></iframe>{/if}
  </div>{/if}
</dialog>
