<script>
  const id=$props.id();
</script>
<div class="home-logo-background" aria-hidden="true">
  <svg viewBox="-70 -30 430 400" fill="none">
    <defs>
      <linearGradient id={id+'-gradient'} x1="38" y1="56" x2="228" y2="280" gradientUnits="userSpaceOnUse">
        <stop stop-color="var(--logo-start,#e83dba)"/>
        <stop offset=".54" stop-color="var(--logo-mid,#9c40f8)"/>
        <stop offset="1" stop-color="var(--logo-end,#65b6e8)"/>
      </linearGradient>
      <filter id={id+'-glow'} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="18" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path d="M28 52H248V100H188V284H140V100H104V228H56V100H28V52Z" fill={'url(#'+id+'-gradient)'} filter={'url(#'+id+'-glow)'}/>
  </svg>
</div>
<style>
  .home-logo-background{display:var(--theme-pi-display,none);position:absolute!important;inset:0;z-index:0!important;pointer-events:none;opacity:var(--theme-bg-opacity,0)}
  svg{position:absolute;height:52%;width:auto;aspect-ratio:430/400;left:80%;top:50%;transform:translate(-80%,-50%);overflow:visible}
</style>
