<script>
  import { onMount } from 'svelte';
  import { applyTheme, applyBuiltInTheme, builtInThemes, defaultColor } from '../lib/theme.js';
  let color = $state(defaultColor);
  let mode = $state('dark');
  let theme = $state('halloween');
  let open = $state(false);
  let colorInput;
  export function openPicker(){open=true;}
  export function openColor(){colorInput?.click();}
  export function toggleMode(){toggle();}
  onMount(() => {
    try { const saved = localStorage.getItem('omp-theme-color'); if (/^#[0-9a-f]{6}$/i.test(saved)) color = saved; } catch {}
    try { mode=localStorage.getItem('omp-theme-mode')==='light'?'light':'dark'; } catch {}
    try {
      const saved=localStorage.getItem('omp-theme-preset');
      if(saved==='custom'||builtInThemes.includes(saved))theme=saved;
      else if(!saved&&(localStorage.getItem('omp-theme-color')||localStorage.getItem('omp-theme-mode')))theme='custom';
    } catch {}
    if(theme==='custom')applyTheme(color,mode);else applyBuiltInTheme(theme);
  });
  function change(event) {
    color = event.currentTarget.value;
    theme = 'custom';
    applyTheme(color,mode);
    try { localStorage.setItem('omp-theme-color', color);localStorage.setItem('omp-theme-preset','custom'); } catch {}
  }
  function toggle(){mode=mode==='dark'?'light':'dark';theme='custom';applyTheme(color,mode);try{localStorage.setItem('omp-theme-mode',mode);localStorage.setItem('omp-theme-preset','custom');}catch{}}
  function choose(name){theme=name;if(name==='custom')applyTheme(color,mode);else applyBuiltInTheme(name);try{localStorage.setItem('omp-theme-preset',name);}catch{} }
  const label=name=>name==='custom'?'Custom color':name.charAt(0).toUpperCase()+name.slice(1);
</script>

<div class="flex items-center gap-1"><input bind:this={colorInput} class="theme-picker" type="color" value={color} oninput={change} aria-label="Choose app color" title="Choose custom app color" /><button class="btn btn-ghost btn-xs" aria-label="Choose theme" title={'Theme: '+label(theme)} onclick={()=>{open=true;}}>◈</button><button class="btn btn-ghost btn-xs" aria-label={mode==='dark'?'Switch to light mode':'Switch to dark mode'} title="Toggle custom light / dark" onclick={toggle}>{mode==='dark'?'☀':'☾'}</button></div>
{#if open}
  <div class="modal modal-open"><div class="modal-box max-w-2xl">
    <div class="flex items-center justify-between"><div><h2 class="text-xl font-semibold">Choose a theme</h2><p class="muted mt-1 text-sm">Preview instantly. Your selection is saved automatically.</p></div><button class="btn btn-ghost btn-sm" aria-label="Close theme picker" onclick={()=>{open=false;}}>×</button></div>
    <button class="btn mt-5 w-full justify-between" class:btn-primary={theme==='custom'} onclick={()=>choose('custom')}><span>Custom color · {color.toUpperCase()}</span><span>{theme==='custom'?'✓':'Use color picker'}</span></button>
    <div class="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-auto p-1 sm:grid-cols-3">
      {#each builtInThemes as name}
        <button data-theme={name} class="rounded-box border bg-base-100 p-3 text-left text-base-content" style:border-color={theme===name?'var(--color-primary)':'var(--color-base-300)'} aria-pressed={theme===name} onclick={()=>choose(name)}>
          <div class="flex items-center justify-between text-sm font-medium"><span>{label(name)}</span>{#if theme===name}<span>✓</span>{/if}</div>
          <span class="mt-3 flex gap-1" aria-hidden="true"><span class="h-5 flex-1 rounded bg-primary"></span><span class="h-5 flex-1 rounded bg-secondary"></span><span class="h-5 flex-1 rounded bg-accent"></span><span class="h-5 flex-1 rounded bg-neutral"></span></span>
        </button>
      {/each}
    </div>
    <div class="modal-action"><button class="btn btn-primary" onclick={()=>{open=false;}}>Done</button></div>
  </div></div>
{/if}
