<script>
  import AgentSprite from "./AgentSprite.svelte";

  let {agents = [], size = 28, onpick = undefined} = $props();
</script>

{#if agents.length}
  <span class="model-assignees">
    {#each agents as agent (agent.name)}
      {#if onpick}
        <button type="button" class="model-avatar" class:fallback={agent.fallback} title={agent.fallback ? `${agent.name} (fallback)` : agent.name} aria-label={`Use ${agent.name} with this model`} onclick={(event) => { event.stopPropagation(); onpick(agent); }}>
          <AgentSprite name={agent.name} {size} />
        </button>
      {:else}
        <span class="model-avatar" class:fallback={agent.fallback} title={agent.fallback ? `${agent.name} (fallback)` : agent.name}>
          <AgentSprite name={agent.name} {size} />
        </span>
      {/if}
    {/each}
  </span>
{/if}

<style>
  .model-avatar {
    display: inline-flex;
    line-height: 0;
  }
  button.model-avatar {
    border: 0;
    padding: 0;
    background: none;
    color: inherit;
    cursor: pointer;
  }
  button.model-avatar:hover {
    transform: translateY(-1px);
  }
  .model-avatar.fallback {
    opacity: 0.55;
  }
</style>
