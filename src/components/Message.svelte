<script>
  import { markdown, h2Sections } from '../lib/markdown.js';
  let { message } = $props();
  let root = $state();
  const copyIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="5.2" y="5.2" width="8" height="8" rx="1.2"/><path d="M10.6 5.2V3.6A1.1 1.1 0 0 0 9.5 2.5H3.6A1.1 1.1 0 0 0 2.5 3.6v5.9A1.1 1.1 0 0 0 3.6 10.6H5.2"/></svg>';
  const checkIcon = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M3.5 8.2 6.4 11.2 12.5 4.8"/></svg>';

  $effect(() => {
    const node = root;
    const text = message.text;
    if (!node || message.role !== 'assistant') return;
    for (const heading of node.querySelectorAll('h2.md-section')) {
      if (heading.querySelector('.heading-copy')) continue;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'heading-copy';
      button.dataset.index = heading.dataset.mdSection || '';
      button.setAttribute('aria-label', 'Copy section');
      button.title = 'Copy section';
      button.innerHTML = copyIcon;
      heading.append(button);
    }
  });

  async function copySection(event) {
    const button = event.target.closest('.heading-copy');
    if (!button || !root?.contains(button)) return;
    const section = h2Sections(message.text)[Number(button.dataset.index)];
    if (!section) return;
    try {
      await navigator.clipboard.writeText(section);
    } catch {
      const area = document.createElement('textarea');
      area.value = section;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.left = '-9999px';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    button.classList.add('copied');
    button.title = 'Copied';
    button.innerHTML = checkIcon;
    clearTimeout(button._reset);
    button._reset = setTimeout(() => {
      button.classList.remove('copied');
      button.title = 'Copy section';
      button.innerHTML = copyIcon;
    }, 1200);
  }
</script>

<article class:message-user={message.role === 'user'} class:message-tool={message.role === 'tool'} class:message-error={message.role === 'error'} class="message">
  <div class="mb-2 text-[11px] tracking-[0.15em] uppercase text-primary">{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'OhMyPi' : message.role === 'tool' ? 'Activity' : 'Notice'}</div>
  {#if message.role === 'assistant'}
    {#if message.thinking}<details class="mb-3 text-sm"><summary class="cursor-pointer text-[var(--theme-muted)]">Thinking</summary><div class="mt-3 whitespace-pre-wrap text-[var(--theme-muted)]">{message.thinking}</div></details>{/if}
    <div class="markdown" bind:this={root} onclick={copySection}>{@html markdown(message.text)}</div>
  {:else}
    <div class="whitespace-pre-wrap break-words">{message.text}</div>
    {#if message.details||message.result}<details class="mt-2 text-xs"><summary class="cursor-pointer">Details</summary>{#if message.details}<pre class="my-3 overflow-auto whitespace-pre-wrap">{message.details}</pre>{/if}{#if message.result}<pre class="max-h-80 overflow-auto whitespace-pre-wrap">{message.result}</pre>{/if}</details>{/if}
  {/if}
</article>
