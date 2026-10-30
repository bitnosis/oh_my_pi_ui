<script>
  import {onMount} from 'svelte';
  import {workspace as w,api,dictationEvents} from '../lib/workspace.svelte.js';
  let {ontext=()=>{},onactive=()=>{},floating=false}=$props();
  let capture=$state(null),phase=$state(''),preview=$state('');
  $effect(()=>{onactive(!!capture);});
  function finish(text,error){
    if(!capture)return;
    const send=capture.sendRequested&&!error;
    capture=null;phase='';preview='';
    if(text?.trim())ontext(text.trim(),{send});
    if(error)w.notice=error;
  }
  async function command(connectionId,type,fields={}){
    return api('/api/rpc',{connectionId,command:{type,...fields}});
  }
  async function toggle(){
    if(capture){
      if(capture.sendRequested)return;
      const current=capture;current.sendRequested=true;phase='transcribing';
      try{const result=await command(current.connectionId,'dictation_stop');if(capture===current)finish(result.text);}
      catch(error){if(capture===current){current.sendRequested=false;phase='recording';w.notice=error.message;}}
      return;
    }
    const current={id:crypto.randomUUID(),connectionId:w.active.id};
    capture=current;phase='starting';preview='';
    try{await command(current.connectionId,'dictation_start',{captureId:current.id});if(capture===current&&phase==='starting')phase='recording';}
    catch(error){if(capture===current)finish('',error.message+' Voice input requires native dictation support, stt.enabled, and a configured @dictation model in OhMyPi.');}
  }
  onMount(()=>{
    const listener=({detail:event})=>{
      if(!capture||event.captureId!==capture.id||event.connectionId!==capture.connectionId)return;
      if(event.type==='dictation_state')phase=event.state;
      if(event.type==='dictation_transcript')preview=event.text||'';
      if(event.type==='dictation_end')finish(event.text,event.error);
    };
    dictationEvents.addEventListener('frame',listener);
    return()=>{dictationEvents.removeEventListener('frame',listener);if(capture)command(capture.connectionId,'dictation_stop').catch(()=>{});};
  });
  $effect(()=>{if(capture&&w.active?.id!==capture.connectionId){const previous=capture;capture=null;phase='';preview='';command(previous.connectionId,'dictation_stop').catch(()=>{});}});
</script>

<div class="relative">
  <button type="button" class="btn btn-ghost btn-square btn-sm tooltip tooltip-top" class:floating class:text-error={!!capture} data-tip={capture?'Stop recording and send':'Dictate a message'} aria-label={capture?'Stop recording and send':'Dictate a message'} aria-pressed={!!capture} disabled={!capture&&(!w.active?.ready||w.active?.closed)} onclick={toggle}>
    {#if capture}<svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2"/></svg>{:else}<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>{/if}
  </button>
  {#if capture}<div class="voice-preview" role="status"><strong>{phase==='starting'?'Starting microphone…':phase==='transcribing'?'Finishing transcription…':'Listening… click stop to send'}</strong>{#if preview}<p>{preview}</p>{/if}<small>Recording on the OhMyPi host. Stop finishes transcription and sends your message.</small></div>{/if}
</div>
<style>
  button.floating{width:54px;height:54px;border-radius:50%;color:var(--color-primary-content);border:1px solid var(--color-primary);background:radial-gradient(circle at 34% 24%,color-mix(in oklab,var(--color-primary) 72%,white),var(--color-primary) 58%,color-mix(in oklab,var(--color-primary) 72%,black));box-shadow:0 0 0 5px color-mix(in oklab,var(--color-base-300) 80%,transparent),0 5px 16px #0008,0 0 24px color-mix(in oklab,var(--color-primary) 45%,transparent)}
  button.floating[aria-pressed="true"]{color:white;background:#dc2626}
  .floating + .voice-preview{left:auto;right:0}
  .voice-preview{position:absolute;z-index:60;bottom:calc(100% + 10px);left:0;width:min(360px,70vw);max-height:220px;overflow:auto;padding:12px;border:1px solid var(--theme-border);border-radius:10px;background:var(--color-base-200);box-shadow:0 8px 24px #0006;font-size:12px}
  .voice-preview p{margin:8px 0;white-space:pre-wrap}.voice-preview small{display:block;margin-top:8px;color:var(--theme-muted)}
</style>

