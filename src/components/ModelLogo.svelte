<script>
  import {modelBrand} from '../lib/model-brand.js';
  let {model}=$props();
  const brand=$derived(modelBrand(model));
</script>
{#if brand}<span class="model-brand-logo" role="img" aria-label={brand.name+' logo'} title={brand.name} style:mask-image={'url("/model-logos/'+brand.id+'.svg")'}></span>
{:else}<svg class="shrink-0 opacity-60" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6v6H9zM9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/></svg>{/if}
<style>
  .model-brand-logo{display:inline-block;width:20px;height:20px;flex-shrink:0;background:currentColor;mask-size:contain;mask-repeat:no-repeat;mask-position:center}
</style>
