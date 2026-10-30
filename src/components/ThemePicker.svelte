<script>
  import { tick } from 'svelte';
  import { builtInThemes } from '../lib/theme.js';
  import { preferences, patchPreferences } from '../lib/preferences.svelte.js';
  const color = $derived(preferences.theme.color);
  const mode = $derived(preferences.theme.mode);
  const theme = $derived(preferences.theme.preset);
  const backgrounds = $derived(preferences.theme.backgrounds);
  let open = $state(false);
  let dialog;
  let colorInput;
  export function openPicker(){open=true;}
  $effect(()=>{if(!open){if(dialog?.open)dialog.close();return;}tick().then(()=>{if(open&&dialog&&!dialog.open)dialog.showModal();});});
  export function openColor(){colorInput?.click();}
  export function toggleMode(){toggle();}
  function setBackgrounds(enabled){patchPreferences({theme:{backgrounds:enabled}});}
  function change(event){patchPreferences({theme:{color:event.currentTarget.value,preset:'custom'}});}
  function toggle(){patchPreferences({theme:{mode:mode==='dark'?'light':'dark',preset:'custom'}});}
  function choose(name){patchPreferences({theme:{preset:name}});}
  const label=name=>name==='custom'?'Custom color':name.charAt(0).toUpperCase()+name.slice(1);
</script>

<div class="flex items-center gap-1"><div class="tooltip tooltip-top" data-tip="Color"><label class="theme-picker" style:background={color}><input bind:this={colorInput} type="color" value={color} oninput={change} aria-label="Choose app color"/></label></div><div class="tooltip tooltip-top" data-tip="Theme"><button class="btn btn-ghost btn-xs" aria-label="Choose theme" onclick={()=>{open=true;}}>◈</button></div><div class="tooltip tooltip-top" data-tip="Light / dark"><button class="btn btn-ghost btn-xs" aria-label={mode==='dark'?'Switch to light mode':'Switch to dark mode'} onclick={toggle}>{mode==='dark'?'☀':'☾'}</button></div></div>
<dialog bind:this={dialog} class="modal context-modal" onclose={()=>{open=false;}}>
  {#if open}<div class="modal-box max-w-2xl">
    <div class="flex items-center justify-between"><div><h2 class="text-xl font-semibold">Choose a theme</h2><p class="muted mt-1 text-sm">Preview instantly. Your selection is saved automatically.</p></div><button class="btn btn-ghost btn-sm" aria-label="Close theme picker" onclick={()=>{open=false;}}>×</button></div>
    <label class="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-box border border-[var(--theme-border)] px-4 py-3"><span class="text-sm font-medium">Show theme backgrounds</span><input class="toggle toggle-primary" type="checkbox" checked={backgrounds} aria-label="Show theme backgrounds" onchange={event=>setBackgrounds(event.currentTarget.checked)}/></label>
    <button class="btn mt-3 w-full justify-between" class:btn-primary={theme==='custom'} onclick={()=>choose('custom')}><span>Custom color · {color.toUpperCase()}</span><span>{theme==='custom'?'✓':'Use color picker'}</span></button>
    <div class="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-auto p-1 sm:grid-cols-3">
      {#each builtInThemes as name}
        <button data-theme={name} class="rounded-box border bg-base-100 p-3 text-left text-base-content" style:border-color={theme===name?'var(--color-primary)':'var(--color-base-300)'} aria-pressed={theme===name} onclick={()=>choose(name)}>
          <div class="flex items-center justify-between text-sm font-medium"><span>{label(name)}</span>{#if theme===name}<span>✓</span>{/if}</div>
          <span class="mt-3 flex gap-1" aria-hidden="true"><span class="h-5 flex-1 rounded bg-primary"></span><span class="h-5 flex-1 rounded bg-secondary"></span><span class="h-5 flex-1 rounded bg-accent"></span><span class="h-5 flex-1 rounded bg-neutral"></span></span>
        </button>
      {/each}
    </div>
    <div class="modal-action"><button class="btn btn-primary" onclick={()=>{open=false;}}>Done</button></div>
  </div>{/if}
</dialog>
