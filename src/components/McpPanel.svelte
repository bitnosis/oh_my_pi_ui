<script>
  import {api,attempt,workspace} from '../lib/workspace.svelte.js';
  let scope=$state('project'),text=$state(''),revision=$state(''),path=$state(''),loaded=$state(false);
  async function load(){loaded=false;await attempt(async()=>{const data=await api('/api/mcp',{folder:workspace.folder,profile:workspace.profile,scope});text=data.text;revision=data.revision;path=data.path;loaded=true;});}
  async function save(){await attempt(async()=>{await api('/api/mcp/save',{folder:workspace.folder,profile:workspace.profile,scope,text,revision});await load();workspace.notice='MCP configuration saved. Restart the affected session to apply it.';});}
  load();
</script>
<div class="panel"><div class="panel-heading"><div><h2>MCP servers</h2><p>Edit OhMyPi’s native MCP configuration. Existing files are backed up before saving.</p></div></div>
  <div class="mb-4 flex gap-3"><select class="select" aria-label="MCP configuration scope" bind:value={scope} onchange={load}><option value="project">Project</option><option value="user">User / profile</option></select><button class="btn" onclick={load}>Reload</button></div><p class="muted mb-3 break-all font-mono text-xs">{path}</p><textarea class="textarea min-h-[400px] w-full font-mono text-sm leading-relaxed" aria-label="MCP JSON configuration" spellcheck="false" bind:value={text} disabled={!loaded}></textarea><div class="mt-4 flex justify-end"><button class="btn btn-primary" disabled={!loaded} onclick={save}>Save MCP configuration</button></div>
</div>
