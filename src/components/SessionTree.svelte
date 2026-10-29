<script>
  import {workspace,attempt,rpc} from '../lib/workspace.svelte.js';
  import {messageText} from '../lib/conversation.js';
  let tree=$state([]),leaf=$state(null),selected=$state(null),label=$state('');
  function flatten(nodes,depth=0){return nodes.flatMap(node=>[{entry:node.entry||node,depth},...flatten(node.children||[],depth+1)]);}
  async function load(){await attempt(async()=>{const data=await rpc('get_tree');tree=flatten(data.tree||[]);leaf=data.leafId;});}
  async function act(type){await attempt(async()=>{const result=await rpc(type,{entryId:selected.entry.id});if(result.editorText)workspace.notice='Restored draft: '+result.editorText;await load();});}
  load();
</script>
<div class="panel"><div class="panel-heading"><div><h2>Conversation tree</h2><p>Browse branches and resume from an earlier point.</p></div><button class="btn btn-sm" onclick={load}>Refresh</button></div>
  {#if !tree.length}<p class="empty-note">This session has no saved entries yet.</p>{/if}
  <div class="grid gap-2">{#each tree as node}<button class="tree-entry" class:selected={selected?.entry.id===node.entry.id} style:margin-left={Math.min(node.depth,12)*14+'px'} onclick={()=>{selected=node;label=node.entry.label||'';}}><span class="badge badge-sm badge-outline mr-2">{node.entry.message?.role||node.entry.type}</span><span class="truncate">{node.entry.label||messageText(node.entry.message).slice(0,130)||node.entry.name||node.entry.type}</span>{#if node.entry.id===leaf}<span class="badge badge-primary badge-sm ml-auto">Current</span>{/if}</button>{/each}</div>
  {#if selected}<div class="mt-5 rounded-box border border-[var(--theme-border)] bg-base-200 p-4"><p class="muted text-xs">Entry {selected.entry.id}</p><pre class="my-4 max-h-60 overflow-auto whitespace-pre-wrap text-sm">{messageText(selected.entry.message)||JSON.stringify(selected.entry,null,2)}</pre><div class="flex flex-wrap gap-2"><button class="btn btn-primary btn-sm" disabled={workspace.active?.busy} onclick={()=>act('navigate_tree')}>Resume here</button><button class="btn btn-sm" disabled={workspace.active?.busy||selected.entry.type!=='message'} onclick={()=>act('fork')}>Fork up to here</button><input class="input input-sm" aria-label="Entry label" placeholder="Add a label" bind:value={label}/><button class="btn btn-sm" onclick={()=>attempt(async()=>{await rpc('set_label',{entryId:selected.entry.id,label});await load();})}>Save label</button></div></div>{/if}
</div>
