<script>
  import {workspace as w, api, attempt, rpc} from '../lib/workspace.svelte.js';

  let {onContext = () => {}, onCost = () => {}} = $props();
  let git = $state(null);
  let branches = $state([]);
  let cost = $state(null);
  let open = $state(false);
  let switching = $state(false);
  let root = $state();

  const staged = $derived(git?.files?.filter(file => file.staged).length || 0);
  const unstaged = $derived(git?.files?.filter(file => file.unstaged).length || 0);
  const ahead = $derived(Number(git?.ahead) || 0);
  const behind = $derived(Number(git?.behind) || 0);
  const gitTip = $derived.by(() => {
    const files = git?.files || [];
    if (!w.folder) return 'Git';
    if (!files.length) return 'Nothing to commit';
    const shown = files.slice(0, 12).map(file => file.path);
    const extra = files.length - shown.length;
    return shown.join('\n') + (extra > 0 ? `\n+${extra} more` : '');
  });

  function compact(value) {
    if (!Number.isFinite(value) || value <= 0) return '';
    if (value >= 1000000) {
      const millions = value / 1000000;
      return (millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10) + 'M';
    }
    if (value >= 1000) return Math.round(value / 1000) + 'K';
    return String(value);
  }

  function percentText(value) {
    if (!Number.isFinite(value)) return '—';
    return (value >= 10 ? String(Math.round(value)) : (Math.round(value * 10) / 10).toFixed(1)) + '%';
  }

  function money(value) {
    if (!Number.isFinite(value)) return '—';
    const sign = value < 0 ? '-$' : '$';
    return sign + (Math.abs(value) < 0.01 && value !== 0 ? Math.abs(value).toFixed(4) : Math.abs(value).toFixed(2));
  }

  const contextLabel = $derived(percentText(w.state.contextUsage?.percent) + (compact(w.state.contextUsage?.contextWindow) ? '/' + compact(w.state.contextUsage?.contextWindow) : ''));

  async function refreshGit() {
    if (!w.folder) { git = null; return; }
    try { git = await api('/api/git/status', {folder: w.folder}); }
    catch { git = null; }
  }

  async function refreshCost() {
    if (!w.active?.ready || w.active.closed) { cost = null; return; }
    try {
      const stats = await rpc('get_session_stats');
      const total = stats?.cost?.total ?? stats?.usage?.cost?.total;
      cost = Number.isFinite(total) ? total : null;
    } catch { /* keep the last cost if the session is busy */ }
  }

  async function toggleBranches() {
    open = !open;
    if (!open || !w.folder) return;
    try {
      branches = (await api('/api/git/branches', {folder: w.folder})).branches || [];
    } catch (error) {
      w.notice = error.message;
    }
  }

  async function checkout(name) {
    if (switching || name === git?.branch) { open = false; return; }
    switching = true;
    const saved = await attempt(async () => {
      git = await api('/api/git/checkout', {folder: w.folder, branch: name});
      return true;
    });
    switching = false;
    if (saved) open = false;
  }

  $effect(() => {
    const folder = w.folder;
    const id = w.active?.id;
    let stop = false;
    const tick = () => { if (!stop) { refreshGit(); if (id) refreshCost(); } };
    tick();
    const timer = setInterval(tick, 15000);
    return () => { stop = true; clearInterval(timer); };
  });

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

<footer class="status-bar" aria-label="Workspace status">
  <div class="status-group" bind:this={root}>
    <button type="button" class="status-item" disabled={!w.folder} aria-haspopup="listbox" aria-expanded={open} onclick={toggleBranches}>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="4.5" cy="3.5" r="1.5"/><circle cx="4.5" cy="12.5" r="1.5"/><circle cx="11.5" cy="6.5" r="1.5"/><path d="M4.5 5v6M4.5 8.2C6 7.2 8.2 6.6 10 6.5"/></svg>
      <span class="max-w-40 truncate">{git?.branch || (w.folder ? '…' : 'No folder')}</span>
      <span aria-hidden="true">▾</span>
    </button>
    {#if open}
      <div class="status-menu" role="listbox" aria-label="Branches">
        {#if !branches.length}<p class="muted px-2 py-2 text-xs">No local branches</p>{/if}
        {#each branches as name (name)}
          <button type="button" class="status-option" class:active={name === git?.branch} role="option" aria-selected={name === git?.branch} disabled={switching} onclick={() => checkout(name)}>
            <span class="truncate">{name}</span>{#if name === git?.branch}<span aria-hidden="true">✓</span>{/if}
          </button>
        {/each}
      </div>
    {/if}
    <button type="button" class="status-item status-git tooltip tooltip-top" data-tip={gitTip} aria-label="Git" disabled={!w.folder} onclick={() => { w.view = 'git'; }}>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M3 3.5v9"/><path d="M3 5h3.5M7.5 5h5"/><path d="M3 9h3"/><path d="M6 9v4"/><path d="M6 11h3M10 11h3"/><path d="M6 13h3M10 13h2"/></svg>
      {#if unstaged}<span>*{unstaged}</span>{/if}
      {#if staged}<span>+{staged}</span>{/if}
    </button>
    <span class="status-readout tooltip tooltip-top" data-tip="Commits to push">↑{ahead}</span>
    <span class="status-readout tooltip tooltip-top" data-tip="Commits to pull">↓{behind}</span>
    <span class="status-divider" aria-hidden="true"></span>
    <button type="button" class="status-item tooltip tooltip-top" class:on={w.view === 'chat'} data-tip="Conversation" aria-label="Conversation" aria-pressed={w.view === 'chat'} onclick={() => { w.view = 'chat'; }}>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path stroke-linejoin="round" d="M2.5 3.2h11v7.2H7.2L4 13.2V10.4H2.5z"/></svg>
    </button>
    <button type="button" class="status-item tooltip tooltip-top" class:on={w.view === 'agents'} data-tip="Agents" aria-label="Agents" aria-pressed={w.view === 'agents'} disabled={!w.folder} onclick={() => { w.view = 'agents'; }}>
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path stroke-linecap="round" d="M8 1.5v1.6"/><circle cx="8" cy="1.4" r=".6" fill="currentColor" stroke="none"/><rect x="3" y="3.3" width="10" height="7.2" rx="2"/><circle cx="6.1" cy="6.5" r=".7" fill="currentColor" stroke="none"/><circle cx="9.9" cy="6.5" r=".7" fill="currentColor" stroke="none"/><path stroke-linecap="round" d="M6.2 8.5h3.6M5.2 10.5v2.3M10.8 10.5v2.3"/></svg>
    </button>
  </div>
  <div class="status-group">
    <button type="button" class="status-item tooltip tooltip-top" data-tip="Context" aria-label="Context usage" disabled={!w.active?.ready || w.active.closed} onclick={onContext}>{contextLabel}</button>
    <button type="button" class="status-item tooltip tooltip-top" data-tip="Cost" aria-label="Session cost" disabled={!w.active?.ready || w.active.closed} onclick={onCost}>{money(cost)}</button>
  </div>
</footer>
