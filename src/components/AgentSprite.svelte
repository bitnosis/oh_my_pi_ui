<script>
  import {agentColor, appearanceFor} from "../lib/agent-appearance.svelte.js";
  import {robotPosition, spriteChoice} from "../lib/robots.js";

  let {name = "", icon = undefined, color = undefined, size = 64} = $props();
  const chosen = $derived(icon === undefined ? appearanceFor(name).icon : icon);
  const choice = $derived(spriteChoice(name, chosen));
  const slot = $derived(robotPosition(choice.index));
  const tint = $derived(color === undefined ? agentColor(name) : color);
  const sheet = $derived(choice.set === "fantasy" ? 'url("/fantasy.png?v=1")' : 'url("/robots.png?v=3")');
</script>

<span
  class="agent-sprite"
  class:tinted={choice.set === "robot" && !!tint}
  class:fantasy={choice.set === "fantasy"}
  style:width="{size}px"
  style:height="{size}px"
  style:--sheet={sheet}
  style:--sprite-x="{slot.x}%"
  style:--sprite-y="{slot.y}%"
  style:--robot-color={tint || "transparent"}
  role="img"
  aria-hidden="true"
>
  {#if choice.set === "fantasy" && tint}
    <span class="outfit"></span>
  {/if}
</span>

<style>
  .agent-sprite {
    position: relative;
    display: block;
    flex-shrink: 0;
    background-image: var(--sheet);
    background-repeat: no-repeat;
    background-position: var(--sprite-x) var(--sprite-y);
    background-size: 500% 500%;
  }
  .agent-sprite.tinted {
    background-image: linear-gradient(var(--robot-color), var(--robot-color)), var(--sheet);
    background-position: var(--sprite-x) var(--sprite-y), var(--sprite-x) var(--sprite-y);
    background-size: 500% 500%, 500% 500%;
    background-blend-mode: color;
    -webkit-mask-image: var(--sheet);
    mask-image: var(--sheet);
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: var(--sprite-x) var(--sprite-y);
    mask-position: var(--sprite-x) var(--sprite-y);
    -webkit-mask-size: 500% 500%;
    mask-size: 500% 500%;
  }
  .outfit {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(var(--robot-color), var(--robot-color)), url("/fantasy-outfit.png?v=1");
    background-repeat: no-repeat;
    background-position: var(--sprite-x) var(--sprite-y), var(--sprite-x) var(--sprite-y);
    background-size: 500% 500%, 500% 500%;
    background-blend-mode: color;
    -webkit-mask-image: url("/fantasy-outfit.png?v=1");
    mask-image: url("/fantasy-outfit.png?v=1");
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
    -webkit-mask-position: var(--sprite-x) var(--sprite-y);
    mask-position: var(--sprite-x) var(--sprite-y);
    -webkit-mask-size: 500% 500%;
    mask-size: 500% 500%;
  }
</style>
