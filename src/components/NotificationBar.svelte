<script>
  import {workspace as w} from '../lib/workspace.svelte.js';
  $effect(()=>{
    const toast=w.toast;if(!toast)return;
    const timer=setTimeout(()=>{if(w.toast===toast)w.toast=null;},4500);
    return ()=>clearTimeout(timer);
  });
</script>
{#if w.toast}<div class="notification-bar" role="status"><span class="notification-icon" aria-hidden="true">✓</span><span class="flex-1">{w.toast.message}</span><button class="btn btn-ghost btn-sm shrink-0" aria-label="Dismiss notification" onclick={()=>{w.toast=null;}}>×</button></div>{/if}
<style>
  .notification-bar{position:absolute;inset:auto 0 0;z-index:45;display:flex;align-items:center;gap:12px;padding:12px 20px;background:var(--color-base-200);color:var(--color-base-content);border:0;border-radius:0;box-shadow:0 8px 30px #0006;font-size:14px;animation:notification-enter .25s ease-out}
  .notification-icon{color:var(--color-primary);font-size:18px}
  @keyframes notification-enter{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
</style>

