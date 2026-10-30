<script>
  import {workspace,attempt,rpc} from '../lib/workspace.svelte.js';

  let open = $state(false);
  let levels = $state([]);
  let changing = $state(false);
  let loading = $state(false);
  let root = $state();

  const current = $derived(workspace.state.thinkingLevel || 'off');
  const label = $derived(title(current));

  function title(level) {
    const text = String(level || '');
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Off';
  }

  function active(level) {
    return String(level).toLowerCase() === String(current).toLowerCase();
  }

  async function toggle() {
    open = !open;
    if (!open) return;
    loading = true;
    const next = await attempt(async () => (await rpc('get_available_thinking_levels')).levels || []);
    loading = false;
    if (next) levels = next;
  }

  async function choose(level) {
    if (changing || workspace.active?.busy || active(level)) { open = false; return; }
    changing = true;
    const saved = await attempt(async () => { await rpc('set_thinking_level', {level}); return true; });
    changing = false;
    if (saved) open = false;
  }

  $effect(() => {
    if (!open) return;
    const onPointer = event => { if (!root?.contains(event.target)) open = false; };
    const onKey = event => { if (event.key === 'Escape') open = false; };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  });
</script>

<div class="model-menu" bind:this={root}>
  <button type="button" class="model-menu-button btn btn-ghost btn-xs" aria-haspopup="listbox" aria-expanded={open} aria-label="Reasoning level" onclick={toggle}>{label} <span class="muted" aria-hidden="true">▾</span></button>
  {#if open}
    <div class="model-menu-list" role="listbox" aria-label="Reasoning">
      {#if !levels.length}<p class="muted px-2 py-3 text-xs">{loading ? 'Loading reasoning levels…' : 'No reasoning levels.'}</p>{/if}
      {#each levels as level (level)}
        <button type="button" class="model-option" class:active={active(level)} role="option" aria-selected={active(level)} disabled={changing || workspace.active?.busy} onclick={() => choose(level)}>
          <span class="flex w-full items-center justify-between gap-3 text-sm"><span>{title(level)}</span>{#if active(level)}<span aria-hidden="true">✓</span>{/if}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
