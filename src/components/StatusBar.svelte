<script>
  import {untrack} from 'svelte';
  import AgentIcon from './AgentIcon.svelte';
  import DictationButton from './DictationButton.svelte';
  import {workspace as w, api, attempt, rpc} from '../lib/workspace.svelte.js';
  import {currentCatalog} from '../lib/catalog.svelte.js';

  let {onContext = () => {}, onCost = () => {},onDictation=()=>{}} = $props();
  let git = $state(null);
  let branches = $state([]);
  let cost = $state(null);
  let open = $state(false);
  let quickNavOpen = $state(false);
  let voiceActive = $state(false);
  let quickNavHovered = $state(false);
  let quickNavHoverSuppressed = $state(false);
  let quickNavOpenedByHover = $state(false);
  let hoverCloseTimer;
  let switching = $state(false);
  let root = $state();
  let navigationRoot = $state();

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
  const destinations = [
    {view:'chat',label:'Chat',x:0,y:-122,delay:150,group:'hero'},
    {view:'agents',label:'Agents',x:-96,y:-82,delay:50,group:'inner'},
    {view:'models',label:'Models',x:96,y:-82,delay:250,group:'inner'},
    {view:'settings',label:'Settings',x:-130,y:0,delay:0,group:'outer'},
    {view:'mcp',label:'MCP',x:-65,y:0,delay:100,group:'outer'},
    {view:'packages',label:'Plugins',x:65,y:0,delay:200,group:'outer'},
    {view:'git',label:'Git',x:130,y:0,delay:300,group:'outer'},
  ];

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

  function navigateTo(view) {
    clearTimeout(hoverCloseTimer);
    w.view = view;
    quickNavOpen = false;
  }

  function onNavigationPointerEnter(event) {
    if (event.pointerType === 'touch') return;
    clearTimeout(hoverCloseTimer);
    quickNavHovered = true;
    if (quickNavHoverSuppressed) return;
    quickNavOpen = true;
    quickNavOpenedByHover = true;
  }

  function onNavigationPointerLeave(event) {
    if (event.pointerType === 'touch') return;
    quickNavHovered = false;
    quickNavHoverSuppressed = false;
    quickNavOpenedByHover = false;
    clearTimeout(hoverCloseTimer);
    hoverCloseTimer = setTimeout(() => { if(!voiceActive)quickNavOpen = false; }, 160);
  }

  function toggleQuickNavigation() {
    clearTimeout(hoverCloseTimer);
    if (quickNavHovered && quickNavOpenedByHover) {
      quickNavOpenedByHover = false;
      quickNavOpen = true;
      return;
    }
    if (quickNavOpen && quickNavHovered) {
      quickNavOpen = false;
      quickNavHoverSuppressed = true;
    } else {
      quickNavOpen = !quickNavOpen;
    }
  }

  function destinationDisabled(view) {
    if (['agents','files','worktrees','git','mcp'].includes(view)) return !w.folder;
    if (view === 'models') return !w.connected || !w.streamOnline || !w.active?.ready || w.active.closed || !currentCatalog().models.length;
    return false;
  }

  const pollWatch = $derived(`${w.folder}\0${w.active?.id || ''}`);
  $effect(() => {
    pollWatch;
    let stop = false;
    let fetching = false;
    const tick = async () => {
      if (stop || fetching || document.hidden) return;
      fetching = true;
      try { await Promise.allSettled([refreshGit(), ...(untrack(() => w.active?.id) ? [refreshCost()] : [])]); }
      finally { fetching = false; }
    };
    untrack(tick);
    const timer = setInterval(tick, 15000);
    return () => { stop = true; clearInterval(timer); };
  });

  $effect(() => {
    if (!open && !quickNavOpen) return;
    const onPointer = event => {
      if (open && !root?.contains(event.target)) open = false;
      if (quickNavOpen && !navigationRoot?.contains(event.target)) quickNavOpen = false;
    };
    const onKey = event => {
      if (event.key === 'Escape') { open = false; quickNavOpen = false; }
    };
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
  </div>
  <nav class="status-navigation" bind:this={navigationRoot} aria-label="Quick workspace navigation" class:expanded={quickNavOpen} onpointerenter={onNavigationPointerEnter} onpointerleave={onNavigationPointerLeave}>
    {#if quickNavOpen}<span class="radial-hover-zone" aria-hidden="true"></span>{/if}
    {#if quickNavOpen}
      <div class="radial-actions" role="group" aria-label="Workspace destinations">
        {#each destinations as destination (destination.view)}
          <button type="button" class="radial-action" class:large={destination.group === 'hero'} class:medium={destination.group === 'inner'} class:small={destination.group === 'outer'} class:active={w.view === destination.view || (destination.view === 'chat' && w.view === 'tree')} style={`--menu-x:${destination.x}px;--menu-y:${destination.y}px;--menu-delay:${destination.delay}ms`} aria-label={destination.label} title={destination.label} aria-pressed={w.view === destination.view || (destination.view === 'chat' && w.view === 'tree')} disabled={destinationDisabled(destination.view)} onclick={() => navigateTo(destination.view)}>
            <span class="radial-icon" class:large={destination.group === 'hero'} class:medium={destination.group === 'inner'} class:small={destination.group === 'outer'}>
              {#if destination.view === 'chat'}<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linejoin="round" d="M2.5 3.2h11v7.2H7.2L4 13.2V10.4H2.5z"/></svg>
              {:else if destination.view === 'agents'}<AgentIcon/>
              {:else if destination.view === 'models'}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M3 5l7-2 7 2M3 5l7 7 7-7M3 15l7-12 7 12M3 15l7-3 7 3" opacity=".7"/><g fill="var(--color-base-100)"><circle cx="3" cy="5" r="2"/><circle cx="3" cy="15" r="2"/><circle cx="10" cy="3" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="17" cy="5" r="2"/><circle cx="17" cy="15" r="2"/></g></svg>
              {:else if destination.view === 'files'}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 5.2h5l1.8 2h8.2v8.6h-15z"/><path d="M2.5 7.2h15" opacity=".55"/></svg>
              {:else if destination.view === 'worktrees'}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true"><circle cx="5" cy="3.5" r="2"/><circle cx="5" cy="16.5" r="2"/><circle cx="15" cy="7" r="2"/><path stroke-linecap="round" d="M5 5.5v9M5 10c3-2 5.2-3 8-3"/></svg>
              {:else if destination.view === 'git'}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true"><circle cx="5" cy="4" r="2"/><circle cx="5" cy="16" r="2"/><circle cx="15" cy="7" r="2"/><path stroke-linecap="round" d="M5 6v8M5 10h4a4 4 0 0 0 4-4"/></svg>
              {:else if destination.view === 'settings'}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" aria-hidden="true"><path d="m8.2 2 .5 1.8a6.5 6.5 0 0 1 2.6 0l.5-1.8 2.1.9-.8 1.7a6.5 6.5 0 0 1 1.8 1.8l1.7-.8.9 2.1-1.8.5a6.5 6.5 0 0 1 0 2.6l1.8.5-.9 2.1-1.7-.8a6.5 6.5 0 0 1-1.8 1.8l.8 1.7-2.1.9-.5-1.8a6.5 6.5 0 0 1-2.6 0l-.5 1.8-2.1-.9.8-1.7a6.5 6.5 0 0 1-1.8-1.8l-1.7.8-.9-2.1 1.8-.5a6.5 6.5 0 0 1 0-2.6l-1.8-.5.9-2.1 1.7.8a6.5 6.5 0 0 1 1.8-1.8l-.8-1.7z"/><circle cx="10" cy="9.9" r="2.7"/></svg>
              {:else if destination.view === 'mcp'}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true"><circle cx="4" cy="10" r="2"/><circle cx="10" cy="4" r="2"/><circle cx="16" cy="10" r="2"/><circle cx="10" cy="16" r="2"/><path d="m5.5 8.5 3-3M11.5 5.5l3 3m0 3-3 3m-3 0-3-3"/></svg>
              {:else}<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h5v4a2.5 2.5 0 1 0 4.8 1H17V3h-4a2.5 2.5 0 1 0-5 0H3v5h4a2.5 2.5 0 1 0 0 5v4h5v-4a2.5 2.5 0 1 0 5-1h-4V7h4"/></svg>{/if}
            </span><span class="radial-label">{destination.label}</span>
          </button>
        {/each}
      </div>
    {/if}
    <div class="quick-nav-voice" class:voice-hidden={!quickNavOpen&&!voiceActive}><DictationButton floating ontext={onDictation} onactive={active=>{voiceActive=active;if(active)quickNavOpen=true;}}/></div>
    {#if !quickNavOpen&&!voiceActive}<button type="button" class="quick-nav-toggle" aria-label="Open workspace menu" aria-expanded={false} aria-haspopup="true" onclick={toggleQuickNavigation}>
      <svg class="quick-nav-plus" class:rotated={quickNavOpen} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
    </button>{/if}
  </nav>
  <div class="status-group">
    <button type="button" class="status-item tooltip tooltip-top" data-tip="Context" aria-label="Context usage" disabled={!w.active?.ready || w.active.closed} onclick={onContext}>{contextLabel}</button>
    <button type="button" class="status-item tooltip tooltip-top" data-tip="Cost" aria-label="Session cost" disabled={!w.active?.ready || w.active.closed} onclick={onCost}>{money(cost)}</button>
  </div>
</footer>
<style>
  .status-bar{position:relative}
  .quick-nav-voice{position:absolute;inset:0;z-index:3}.quick-nav-voice.voice-hidden{display:none}
  .status-navigation{position:absolute;z-index:55;left:calc(50% + 142.5px + 12px);top:-27px;width:54px;height:54px;transform:translateX(-50%);}
  .radial-hover-zone{position:absolute;z-index:1;top:-190px;right:-170px;bottom:-34px;left:-170px;background:transparent;pointer-events:auto}
  .quick-nav-toggle{position:absolute;z-index:3;inset:0;display:grid;width:54px;height:54px;place-items:center;border:1px solid color-mix(in oklab,var(--color-primary) 62%,white 8%);border-radius:50%;color:var(--color-primary-content);background:radial-gradient(circle at 34% 24%,color-mix(in oklab,var(--color-primary) 72%,white),var(--color-primary) 58%,color-mix(in oklab,var(--color-primary) 72%,black));box-shadow:0 0 0 5px color-mix(in oklab,var(--color-base-300) 80%,transparent),0 5px 16px #0008,0 0 24px color-mix(in oklab,var(--color-primary) 45%,transparent);cursor:pointer;transition:transform .25s cubic-bezier(.2,.9,.3,1.3),box-shadow .25s ease}
  .quick-nav-toggle:hover{transform:scale(1.08);box-shadow:0 0 0 5px color-mix(in oklab,var(--color-base-300) 80%,transparent),0 7px 20px #0009,0 0 32px color-mix(in oklab,var(--color-primary) 60%,transparent)}
  .quick-nav-toggle:focus-visible,.radial-action:focus-visible{outline:2px solid var(--color-primary);outline-offset:4px}
  .quick-nav-plus{width:23px;height:23px;transition:transform .34s cubic-bezier(.2,.9,.3,1.3)}
  .quick-nav-plus.rotated{transform:rotate(135deg)}
  .radial-actions{position:absolute;z-index:2;inset:0;pointer-events:none}
  .radial-action{position:absolute;top:calc(50% + var(--menu-y));left:calc(50% + var(--menu-x));display:flex;width:54px;height:54px;flex-direction:column;align-items:center;gap:4px;border:0;background:none;color:var(--color-base-content);cursor:pointer;pointer-events:auto;transform:translate(-50%,-50%);animation:radial-action-in .55s cubic-bezier(.16,1,.3,1) both,radial-float 3.6s ease-in-out infinite;animation-delay:var(--menu-delay),calc(var(--menu-delay) + 550ms)}
  .radial-action.large{width:78px;height:78px}
  .radial-action.medium{width:64px;height:64px}
  .radial-icon{display:grid;width:46px;height:46px;place-items:center;border:1px solid color-mix(in oklab,var(--color-primary) 40%,var(--theme-border));border-radius:50%;background:color-mix(in oklab,var(--color-base-200) 96%,transparent);box-shadow:0 5px 18px #0008,0 0 16px color-mix(in oklab,var(--color-primary) 16%,transparent);transition:transform .2s ease,color .2s ease,border-color .2s ease,box-shadow .2s ease}
  .radial-icon.large{width:70px;height:70px}
  .radial-icon.medium{width:54px;height:54px}
  .radial-icon :global(svg){width:21px;height:21px}
  .radial-icon.large :global(svg){width:32px;height:32px}
  .radial-icon.medium :global(svg){width:26px;height:26px}
  .radial-action:hover .radial-icon,.radial-action.active .radial-icon{color:var(--color-primary);border-color:var(--color-primary);box-shadow:0 5px 18px #0008,0 0 22px color-mix(in oklab,var(--color-primary) 38%,transparent);transform:translateY(-5px) scale(1.09)}
  .radial-label{position:absolute;top:-20px;left:50%;padding:2px 7px;border:1px solid var(--theme-border);border-radius:999px;background:var(--color-base-200);box-shadow:0 3px 10px #0006;font-size:10px;line-height:1.4;white-space:nowrap;transform:translateX(-50%)}
  .radial-action.large .radial-label,.radial-action.medium .radial-label{top:-18px;font-size:11px}
  .radial-action.small{width:50px;height:50px}
  .radial-icon.small{width:40px;height:40px}
  .radial-icon.small :global(svg){width:19px;height:19px}
  .radial-action:disabled{opacity:.42;cursor:default;animation:radial-float 3.6s ease-in-out infinite;animation-delay:calc(var(--menu-delay) + 550ms)}
  .radial-action:disabled:hover .radial-icon{color:inherit;border-color:var(--theme-border);box-shadow:0 5px 18px #0008}
  @keyframes radial-action-in{from{opacity:0;transform:translate(calc(-50% - 18px),calc(-50% + 16px)) scale(.85)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
  @keyframes radial-float{0%,100%{transform:translate(-50%,-50%)}50%{transform:translate(-50%,calc(-50% - 6px))}}
  @media(max-width:850px){.status-navigation{left:calc(50% + 112.5px + 12px)}}
  @media(max-width:600px){.status-navigation{left:calc(50% + 12px)}}
</style>


