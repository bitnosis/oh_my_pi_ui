<script>
  import { markdown } from '../lib/markdown.js';
  let { message } = $props();
</script>

<article class:message-user={message.role === 'user'} class:message-tool={message.role === 'tool'} class:message-error={message.role === 'error'} class="message">
  <div class="mb-2 text-[11px] tracking-[0.15em] uppercase text-primary">{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'OhMyPi' : message.role === 'tool' ? 'Activity' : 'Notice'}</div>
  {#if message.role === 'assistant'}
    {#if message.thinking}<details class="mb-3 text-sm"><summary class="cursor-pointer text-[var(--theme-muted)]">Thinking</summary><div class="mt-3 whitespace-pre-wrap text-[var(--theme-muted)]">{message.thinking}</div></details>{/if}
    <div class="markdown">{@html markdown(message.text)}</div>
  {:else}
    <div class="whitespace-pre-wrap break-words">{message.text}</div>
    {#if message.details||message.result}<details class="mt-2 text-xs"><summary class="cursor-pointer">Details</summary>{#if message.details}<pre class="my-3 overflow-auto whitespace-pre-wrap">{message.details}</pre>{/if}{#if message.result}<pre class="max-h-80 overflow-auto whitespace-pre-wrap">{message.result}</pre>{/if}</details>{/if}
  {/if}
</article>
