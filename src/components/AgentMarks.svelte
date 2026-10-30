<script>
  import AgentSprite from "./AgentSprite.svelte";

  let {agents = [], size = 28} = $props();
</script>

{#if agents.length}
  <span class="model-assignees">
    {#each agents as agent (agent.name)}
      <span class="model-avatar" class:fallback={agent.fallback} title={agent.fallback ? `${agent.name} (fallback)` : agent.name}>
        <AgentSprite name={agent.name} {size} />
      </span>
    {/each}
  </span>
{/if}

<style>
  .model-avatar {
    display: inline-flex;
    line-height: 0;
  }
  .model-avatar.fallback {
    opacity: 0.55;
  }
</style>
