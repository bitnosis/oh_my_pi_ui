<script>
  import {agentColor} from "../lib/agent-appearance.svelte.js";
  let {agents = []} = $props();
  const shown = $derived(agents.slice(0, 3));
  const extra = $derived(Math.max(0, agents.length - shown.length));
  const label = name => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  const tip = $derived(agents.map((agent) => (agent.fallback ? `${agent.name} (fallback)` : agent.name)).join(", "));
</script>

{#if agents.length}
  <span class="model-assignees" title={tip}>
    {#each shown as agent (agent.name)}
      <span class="badge badge-outline badge-xs model-assignee" style:color={agentColor(agent.name) || null} style:border-color={agentColor(agent.name) || null}>{label(agent.name)}</span>
    {/each}
    {#if extra > 0}<span class="badge badge-ghost badge-xs model-assignee">+{extra}</span>{/if}
  </span>
{/if}
