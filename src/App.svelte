<script>
  import {onMount,tick} from 'svelte';
  import ThemePicker from './components/ThemePicker.svelte';
  import Logo from './components/Logo.svelte';
  import Message from './components/Message.svelte';
  import FolderPicker from './components/FolderPicker.svelte';
  import AgentDialog from './components/AgentDialog.svelte';
  import SessionTree from './components/SessionTree.svelte';
  import AgentHub from './components/AgentHub.svelte';
  import ModelsPanel from './components/ModelsPanel.svelte';
  import SettingsPanel from './components/SettingsPanel.svelte';
  import FilesPanel from './components/FilesPanel.svelte';
  import WorktreesPanel from './components/WorktreesPanel.svelte';
  import McpPanel from './components/McpPanel.svelte';
  import PackagesPanel from './components/PackagesPanel.svelte';
  import {workspace as w,api,attempt,rpc,refresh,initialize,closeWorkspace,startSession,selectConnection,sendPrompt} from './lib/workspace.svelte.js';

  let prompt=$state(''),search=$state(''),projectFilter=$state(''),folderPicker=$state(false),sending=$state(false),behavior=$state('followUp');
  let messagePanel=$state(),composer=$state(),followLatest=$state(true),sessionName=$state(''),renaming=$state(false),commands=$state([]),goal=$state(''),budget=$state(''),attachments=$state([]),quit=$state(false);
  const views=[['chat','Conversation'],['tree','Tree'],['agents','Agents'],['models','Models'],['files','Files'],['worktrees','Worktrees'],['settings','Settings'],['mcp','MCP'],['packages','Plugins & skills']];
  const sessionViews=new Set(['chat','tree','agents','models']);
  const filteredSessions=$derived(w.overview.sessions.filter(s=>(!projectFilter||s.folder===projectFilter)&&(s.title+' '+s.folder).toLowerCase().includes(search.toLowerCase())));
  const ready=$derived(Boolean(w.active?.ready&&!w.active?.closed));
  onMount(()=>{let disposed=false;initialize().then(()=>{if(disposed)closeWorkspace();});return()=>{disposed=true;closeWorkspace();};});
  $effect(()=>{const revision=w.revision;const panel=messagePanel;if(revision&&panel&&followLatest)tick().then(()=>{if(followLatest)panel.scrollTop=panel.scrollHeight;});});
  async function submit(event){event.preventDefault();if(!prompt.trim()||sending||!ready)return;sending=true;const result=await attempt(()=>sendPrompt(prompt,w.active.busy?behavior:undefined,attachments.map(a=>a.content)));if(result!==undefined){prompt='';attachments=[];followLatest=true;}sending=false;}
  async function openSession(session,restore=false){await attempt(()=>startSession({sessionPath:session.path,restore}));}
  async function newSession(){await attempt(()=>startSession());}
  async function showCommands(){await attempt(async()=>{commands=(await rpc('get_available_commands')).commands||[];});}
  async function attach(event){
    const files=[...event.currentTarget.files];event.currentTarget.value='';
    await attempt(async()=>{for(const file of files){if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('Choose PNG, JPEG, WebP, or GIF images.');if(file.size>4*1024*1024||attachments.length>=3)throw new Error('Attach up to three images, each smaller than 4 MB.');const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});attachments=[...attachments,{name:file.name,content:{type:'image',data:String(url).split(',')[1],mimeType:file.type}}];}});
  }
  const date=value=>new Date(value).toLocaleDateString(undefined,{month:'short',day:'numeric'});
</script>

<div class="workspace-shell">
  <aside class="workspace-sidebar">
    <div class="flex items-center justify-between"><div><h1 class="flex items-center gap-2.5 text-2xl font-semibold tracking-tight"><Logo connected={ready&&w.streamOnline}/>OhMyPi-UI</h1><p class="muted mt-1 text-xs">Your agent workspace</p></div><span class="badge badge-outline badge-sm">Local</span></div>
    <div class="my-5 flex gap-2"><button class="btn btn-primary flex-1" onclick={newSession} disabled={!w.folder||!w.connected||w.pending>0}>＋ New session</button><button class="btn btn-square btn-outline" title="Add project" aria-label="Add project" onclick={()=>{folderPicker=true;}}>▱</button></div>
    <label class="muted mb-2 text-xs" for="project">Project</label>
    <select id="project" class="select mb-3 w-full" bind:value={w.folder} onchange={()=>{projectFilter=w.folder;}}><option value="">Choose a project…</option>{#each w.overview.projects as project}<option value={project.folder}>{project.name}</option>{/each}</select>
    <div class="mb-5 flex items-center gap-2"><label class="muted text-xs" for="profile">Profile</label><select id="profile" class="select select-sm min-w-0 flex-1" bind:value={w.profile}>{#each w.overview.profiles as profile}<option value={profile}>{profile}</option>{/each}</select><button class="btn btn-ghost btn-sm" title="Refresh sessions" onclick={()=>attempt(()=>refresh(true))}>↻</button></div>
    {#if w.overview.running.length}<div class="sidebar-section-title">Running <span>{w.overview.running.length}</span></div><div class="mb-4 grid gap-1">{#each w.overview.running as connection}<button class="session-row" class:active={w.active?.id===connection.id} onclick={()=>selectConnection(connection)}><span class="status-dot" class:working={connection.busy}></span><span class="min-w-0 flex-1"><span class="block truncate text-sm">{connection.name||connection.folder.split(/[\\/]/).pop()||'Session'}</span><small class="muted">{connection.dialogCount?'Needs your input':connection.busy?'Working':connection.ready?'Ready':'Starting…'}</small></span></button>{/each}</div>{/if}
    <div class="sidebar-section-title">Saved sessions <button class="btn btn-ghost btn-xs" onclick={()=>{projectFilter='';}}>All projects</button></div>
    <input class="input input-sm my-3 w-full" placeholder="Search sessions…" aria-label="Search sessions" bind:value={search}/>
    {#if projectFilter}<button class="muted mb-2 text-left text-xs" onclick={()=>{projectFilter='';}}>× Clear project filter</button>{/if}
    <div class="min-h-20 flex-1 overflow-auto">{#each filteredSessions as session}<div class="group relative"><button class="session-row w-full" title={session.folder} onclick={()=>openSession(session)}><span class="min-w-0 flex-1"><span class="block truncate text-sm">{session.title}</span><small class="muted block truncate">{session.folder.split(/[\\/]/).pop()} · {date(session.updatedAt)}{session.profile!=='default'?' · '+session.profile:''}</small></span></button><button class="session-restore" title="Restore interrupted work and agents" aria-label={'Restore '+session.title} onclick={()=>openSession(session,true)}>↺</button></div>{/each}{#if !filteredSessions.length}<p class="muted p-3 text-xs leading-relaxed">{w.initialized?'No saved sessions match. Add a project and start a new session.':'Looking for your OhMyPi sessions…'}</p>{/if}</div>
    <div class="sidebar-bottom"><ThemePicker/><span class="muted flex-1 text-[10px]">{w.overview.platform==='win32'?'Windows':'Linux / Unix'} · {w.overview.executable?'OhMyPi installed':'OhMyPi not found'}</span><button class="btn btn-ghost btn-xs" title="Quit workspace service" aria-label="Quit workspace" onclick={()=>{quit=true;}}>⏻</button></div>
  </aside>
  <main class="flex min-h-0 min-w-0 flex-col">
    <header class="workspace-header">
      <div class="min-w-0 flex-1">{#if renaming}<form class="flex gap-2" onsubmit={e=>{e.preventDefault();attempt(async()=>{await rpc('set_session_name',{name:sessionName});renaming=false;});}}><input class="input input-sm min-w-0" aria-label="Session name" bind:value={sessionName}/><button class="btn btn-sm">Save</button><button type="button" class="btn btn-ghost btn-sm" onclick={()=>{renaming=false;}}>×</button></form>{:else}<button class="max-w-full truncate text-left font-medium" disabled={!ready} title="Rename this session" onclick={()=>{sessionName=w.state.sessionName||'';renaming=true;}}>{w.state.sessionName||'OhMyPi-UI'}{#if ready}<span class="muted ml-2 text-xs">✎</span>{/if}</button>{/if}<p class="muted mt-1 truncate text-xs">{w.active?.folder||w.folder||'Choose a project to begin'}</p></div>
      <div class="flex items-center gap-3">{#if w.active}<span class="muted text-xs">{w.active.closed?'Stopped':w.active.busy?'● Working…':ready?'● Connected':'Starting…'}</span><button class="btn btn-ghost btn-sm" onclick={()=>attempt(()=>api('/api/stop',{connectionId:w.active.id}))} disabled={w.active.closed}>Close session</button>{/if}</div>
    </header>
    <nav class="workspace-tabs" aria-label="Workspace sections">{#each views as [id,title]}<button class="workspace-tab" class:active={w.view===id} disabled={(sessionViews.has(id)&&id!=='chat'&&!ready)||(['files','worktrees','mcp'].includes(id)&&!w.folder)} onclick={()=>{w.view=id;}}>{title}</button>{/each}</nav>
    {#if w.notice}<div class="workspace-notice" role="alert"><span class="whitespace-pre-wrap">{w.notice}</span><button class="btn btn-ghost btn-xs shrink-0" aria-label="Dismiss notice" onclick={()=>{w.notice='';}}>×</button></div>{/if}
    {#if !w.overview.executable&&w.initialized}<div class="workspace-notice">OhMyPi is not installed or could not be located. Install it, or set OMP_COMMAND to its executable path and restart the app.</div>{/if}
    {#if w.view==='chat'}
      <section class="message-panel min-h-0 flex-1 overflow-y-auto" aria-label="Conversation" aria-live="polite" bind:this={messagePanel} onscroll={()=>{followLatest=messagePanel.scrollHeight-messagePanel.scrollTop-messagePanel.clientHeight<100;}}>
        {#if !w.conversation.messages.length}<div class="welcome mx-auto max-w-[650px] pt-[9vh]"><span class="text-xs tracking-[.2em] text-primary">A HOME FOR YOUR AGENTS</span><h2 class="my-5 font-serif text-[42px] leading-tight">What would you like to build?</h2><p class="muted leading-loose">Pick a saved conversation, or choose a project and start a new session. OhMyPi launches here—no terminal needed.</p><div class="mt-6 flex flex-wrap gap-2"><button class="btn btn-primary" disabled={!w.folder||!w.connected} onclick={newSession}>Start a new session</button><button class="btn btn-outline" onclick={()=>{folderPicker=true;}}>Add a project</button></div></div>
        {:else}{#each w.conversation.messages as message (message.id)}<Message {message}/>{/each}{/if}
        {#each w.links as link}<div class="my-4 rounded-box border border-[var(--theme-border)] p-4"><a class="link link-primary" href={link.url} target="_blank" rel="noopener noreferrer">{link.instructions}</a><p class="muted mt-2 text-xs">Complete sign-in in the opened page, then answer any follow-up question here.</p></div>{/each}
      </section>
      <footer class="composer-wrap pb-5 pt-3">
        {#if ready}<div class="mb-3 flex flex-wrap items-center gap-2 text-xs"><button class="btn btn-ghost btn-xs" onclick={()=>{w.view='models';}}>{w.state.model?.name||w.state.model?.id||'Choose model'} <span class="muted">▾</span></button><span class="muted">{w.state.thinkingLevel||'Default reasoning'}</span>{#if w.state.contextUsage}<span class="muted ml-auto">Context {Math.round(w.state.contextUsage.percent||0)}%</span>{/if}<button class="btn btn-ghost btn-xs" disabled={w.active?.busy} onclick={()=>attempt(()=>rpc('fork'))}>Fork</button><button class="btn btn-ghost btn-xs" disabled={w.active?.busy} onclick={()=>attempt(()=>rpc('compact'))}>Compact</button></div>{/if}
        {#if w.state.queuedMessages?.followUp?.length||w.state.queuedMessages?.steering?.length}<div class="mb-3 rounded-box border border-[var(--theme-border)] p-3 text-xs"><strong>Queued messages</strong>{#each ['steering','followUp'] as queue}{#each w.state.queuedMessages?.[queue]||[] as item}<div class="mt-2 flex items-center gap-2"><span class="badge badge-xs">{queue}</span><span class="truncate">{typeof item==='string'?item:item.text}</span><button class="btn btn-ghost btn-xs" onclick={()=>attempt(()=>rpc('remove_queued_message',{queue,message:typeof item==='string'?item:item.text}))}>Remove</button>{#if queue==='followUp'}<button class="btn btn-ghost btn-xs" onclick={()=>attempt(()=>rpc('promote_queued_message',{message:typeof item==='string'?item:item.text}))}>Steer</button>{/if}</div>{/each}{/each}</div>{/if}
        <form class="rounded-2xl border border-[var(--theme-border)] bg-base-300 p-3" onsubmit={submit}>
          {#if attachments.length}<div class="flex flex-wrap gap-2">{#each attachments as attachment,i}<button type="button" class="badge badge-outline h-auto p-2 text-xs" onclick={()=>{attachments=attachments.filter((_,index)=>index!==i);}}>{attachment.name} ×</button>{/each}</div>{/if}
          <textarea class="textarea min-h-[82px] w-full resize-y border-0 bg-transparent p-3 shadow-none focus:outline-none" aria-label="Message OhMyPi" placeholder={ready?'Describe what you’d like to do…':'Start or resume a session to chat…'} bind:value={prompt} bind:this={composer} disabled={!ready} onkeydown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.currentTarget.form.requestSubmit();}}}></textarea>
          <div class="flex flex-wrap items-center justify-between gap-2"><div class="flex items-center gap-2"><label class="btn btn-ghost btn-xs" title="Attach images"><span>＋ Image</span><input class="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={!ready} onchange={attach}/></label><button type="button" class="btn btn-ghost btn-xs" disabled={!ready} onclick={showCommands}>/ Commands</button></div><div class="flex gap-2">{#if w.active?.busy}<select class="select select-sm max-w-32" aria-label="Message behavior" bind:value={behavior}><option value="followUp">Follow up</option><option value="steer">Steer now</option></select><button type="button" class="btn btn-outline btn-sm" onclick={()=>attempt(()=>rpc('abort'))}>Stop</button>{/if}<button class="btn btn-primary btn-sm" disabled={!ready||!w.streamOnline||sending||!prompt.trim()}>Send ↑</button></div></div>
        </form>
        {#if ready}<details class="mt-3 text-xs"><summary class="muted cursor-pointer">Goal mode & session controls</summary><div class="my-3 flex flex-wrap gap-2"><input class="input input-sm flex-1" aria-label="Goal objective" placeholder="Goal objective…" bind:value={goal}/><input class="input input-sm w-32" type="number" min="1" placeholder="Token budget" aria-label="Goal token budget" bind:value={budget}/><button class="btn btn-sm" disabled={!goal.trim()} onclick={()=>attempt(()=>rpc('goal',{op:'create',objective:goal,...(budget?{token_budget:Number(budget)}:{})}))}>Set goal</button><button class="btn btn-sm" onclick={()=>attempt(()=>rpc('goal',{op:'pause'}))}>Pause goal</button><button class="btn btn-sm" onclick={()=>attempt(()=>rpc('goal',{op:'resume'}))}>Resume</button></div>{#if w.state.goal}<pre class="overflow-auto text-xs">{JSON.stringify(w.state.goal,null,2)}</pre>{/if}</details>{/if}
      </footer>
    {:else}
      <section class="min-h-0 flex-1 overflow-auto" aria-label={w.view}>
        {#key w.view+'-'+(w.active?.id||'')+'-'+w.folder}
          {#if w.view==='tree'}<SessionTree/>{:else if w.view==='agents'}<AgentHub/>{:else if w.view==='models'}<ModelsPanel/>{:else if w.view==='files'}<FilesPanel/>{:else if w.view==='worktrees'}<WorktreesPanel/>{:else if w.view==='settings'}<SettingsPanel/>{:else if w.view==='mcp'}<McpPanel/>{:else if w.view==='packages'}<PackagesPanel/>{/if}
        {/key}
      </section>
    {/if}
  </main>
</div>
{#if folderPicker}<FolderPicker onclose={()=>{folderPicker=false;}}/>{/if}
{#if quit}<div class="modal modal-open"><div class="modal-box"><h3 class="text-lg font-semibold">Quit the workspace?</h3><p class="muted my-4">This stops the local service and all sessions running in this app. Saved conversations remain in OhMyPi. Reopen the launcher to return.</p><div class="modal-action"><button class="btn btn-ghost" onclick={()=>{quit=false;}}>Cancel</button><button class="btn btn-primary" onclick={()=>attempt(async()=>{await api('/api/shutdown');quit=false;closeWorkspace();w.connected=false;w.notice='Workspace stopped. Reopen the launcher when you want to return.';})}>Quit workspace</button></div></div></div>{/if}
{#each w.dialogs.slice(0,1) as dialog (dialog.id)}<AgentDialog {dialog}/>{/each}
{#if commands.length}<div class="modal modal-open"><div class="modal-box max-w-2xl"><div class="flex justify-between"><h3 class="text-lg font-semibold">OhMyPi commands</h3><button class="btn btn-ghost btn-sm" onclick={()=>{commands=[];}}>Close</button></div><div class="mt-4 grid max-h-96 gap-2 overflow-auto">{#each commands as command}<button class="rounded-box bg-base-200 p-3 text-left" onclick={()=>{prompt='/'+command.name+' ';commands=[];composer?.focus();}}><strong class="font-mono text-sm">/{command.name}</strong><p class="muted mt-1 text-xs">{command.description}</p></button>{/each}</div></div></div>{/if}
