<script>
  let {value='standard',onchange}= $props();
  let popup;
  const options=[
    ['standard','Standard','Relaxed line height and message spacing.'],
    ['compact','Compact','Tighter lines and smaller gaps.'],
    ['super-compact','Super compact','The tightest spacing, with slightly smaller text.'],
  ];
  function choose(next){onchange(next);popup.hidePopover();}
</script>

<div class="tooltip tooltip-top" data-tip="Text"><button class="btn btn-ghost btn-xs font-mono font-bold" aria-label="Chat spacing" aria-haspopup="dialog" popovertarget="chat-spacing-menu">T</button></div>
<div bind:this={popup} id="chat-spacing-menu" popover="auto" class="spacing-popover" role="dialog" aria-label="Chat spacing options">
  <h2 class="mb-3 text-sm font-semibold">Chat spacing</h2>
  <div class="grid gap-1" role="radiogroup" aria-label="Chat spacing">
    {#each options as [id,label,description]}
      <button class="spacing-option" class:selected={value===id} role="radio" aria-checked={value===id} onclick={()=>choose(id)}>
        <span class="flex items-center justify-between text-sm font-medium"><span>{label}</span>{#if value===id}<span aria-hidden="true">✓</span>{/if}</span>
        <span class="muted mt-1 block text-xs leading-normal">{description}</span>
      </button>
    {/each}
  </div>
</div>
