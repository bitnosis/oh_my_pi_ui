<script>
  import {workspace,attempt,rpc} from '../lib/workspace.svelte.js';
  import {agentsForModels,assigneesFor} from '../lib/model-agents.js';
  import AgentMarks from './AgentMarks.svelte';
  import {currentCatalog,refreshCatalog} from '../lib/catalog.svelte.js';

  let open = $state(false);
  const cached=$derived(currentCatalog());
  const models=$derived(cached.models),agents=$derived(cached.agents),roles=$derived(cached.roles);
  const available = $derived(Boolean(workspace.connected && workspace.streamOnline && workspace.active?.ready && !workspace.active.closed && models.length));
  let query = $state('');
  let changing = $state(false);
  let loading = $state(false);
  let root = $state();

  const current = $derived(workspace.state.model);
  const label = $derived(current?.name || current?.id || 'Choose model');
  const visible = $derived(models.filter(model => `${model.name||''} ${model.id||''} ${model.provider||''}`.toLowerCase().includes(query.trim().toLowerCase())));
  const assigned = $derived(agentsForModels(models, agents, roles));

  function active(model) {
    return model.id === current?.id && model.provider === current?.provider;
  }

  async function toggle() {
    if (!available) { open = false; return; }
    open = !open;
    if (!open) return;
    query = '';
    loading = true;
    try { await attempt(()=>refreshCatalog()); } finally { loading=false; }
  }

  async function choose(model) {
    if (changing || workspace.active?.busy || active(model)) { open = false; return; }
    changing = true;
    const saved = await attempt(async () => { await rpc('set_model', {provider: model.provider, modelId: model.id}); return true; });
    changing = false;
    if (saved) open = false;
  }

  $effect(() => { if (!available) open = false; });

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
  <button type="button" class="model-menu-button btn btn-ghost btn-xs" aria-haspopup="listbox" aria-expanded={open} disabled={!available} onclick={toggle}>{label} <span class="muted" aria-hidden="true">▾</span></button>
  {#if open}
    <div class="model-menu-list" role="listbox" aria-label="Models">
      <input class="input input-xs mb-1 w-full" aria-label="Search models" placeholder="Search models…" bind:value={query}/>
      {#if !visible.length}<p class="muted px-2 py-3 text-xs">{loading ? 'Loading models…' : 'No models match.'}</p>{/if}
      {#each visible as model (model.provider + '/' + model.id)}
        <button type="button" class="model-option" class:active={active(model)} role="option" aria-selected={active(model)} disabled={changing || workspace.active?.busy} onclick={() => choose(model)}>
          <span class="flex w-full items-center gap-2 text-sm"><AgentMarks agents={assigneesFor(model, assigned)} /><span class="min-w-0 flex-1 truncate">{model.name || model.id}</span>{#if active(model)}<span aria-hidden="true">✓</span>{/if}</span>
          <span class="muted text-xs">{model.provider}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
