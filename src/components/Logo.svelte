<script>
  let {connected=false}=$props();
  const id=$props.id();
</script>

<svg class="omp-logo" viewBox="0 0 288 304" fill="none" role="img" aria-label={connected?'OhMyPi connected':'OhMyPi'}>
  <defs>
    <linearGradient id={id+'-gradient'} x1="38" y1="56" x2="228" y2="280" gradientUnits="userSpaceOnUse">
      <stop class="logo-gradient-start"/>
      <stop class="logo-gradient-mid" offset=".54"/>
      <stop class="logo-gradient-end" offset="1"/>
    </linearGradient>
    <filter id={id+'-glow'} x="-150%" y="-150%" width="400%" height="400%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="10"/>
    </filter>
  </defs>
  <path d="M28 52H248V100H188V284H140V100H104V228H56V100H28V52Z" fill={'url(#'+id+'-gradient)'}/>
  {#if connected}
    <circle cx="248" cy="52" r="25" fill="var(--color-base-200)"/>
    <circle cx="248" cy="52" r="17" fill="#39ef89" opacity=".8" filter={'url(#'+id+'-glow)'}/>
    <circle cx="248" cy="52" r="13" fill="#55f6a0"/>
    <circle cx="245" cy="48" r="4" fill="#d7ffe8" opacity=".85"/>
  {/if}
</svg>

<style>
  .omp-logo{display:block;width:38px;height:41px;flex-shrink:0;overflow:visible}
  .logo-gradient-start{stop-color:var(--logo-start,#e83dba)}
  .logo-gradient-mid{stop-color:var(--logo-mid,#9c40f8)}
  .logo-gradient-end{stop-color:var(--logo-end,#65b6e8)}
</style>
