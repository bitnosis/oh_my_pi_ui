<script>
  const layers=[{x:60,ys:[90,160,230]},{x:180,ys:[45,102,160,218,275]},{x:300,ys:[45,102,160,218,275]},{x:420,ys:[90,160,230]}];
</script>
<div class="neural-loader" role="status" aria-label="Loading OhMyPi models and providers">
  <svg width="960" height="640" viewBox="0 0 480 320" fill="none" aria-hidden="true">
    {#each layers.slice(0,-1) as layer,i}{#each layer.ys as y,j}{#each layers[i+1].ys as nextY,k}
      <path class="connection" d={'M'+layer.x+' '+y+' L'+layers[i+1].x+' '+nextY}/>
      <path class="signal" style:animation-delay={(i*.65+(j+k)*.14)+'s'} d={'M'+layer.x+' '+y+' L'+layers[i+1].x+' '+nextY}/>
    {/each}{/each}{/each}
    {#each layers as layer,i}{#each layer.ys as y,j}
      <circle class="halo" style:animation-delay={(i*.65+j*.12)+'s'} cx={layer.x} cy={y} r="17"/>
      <circle class="node" style:animation-delay={(i*.65+j*.12)+'s'} cx={layer.x} cy={y} r="9"/>
      <circle cx={layer.x-2} cy={y-2} r="2.5" fill="currentColor" opacity=".7"/>
    {/each}{/each}
  </svg>
  <p class="muted text-sm">Loading OhMyPi models and providers…</p>
</div>
<style>
  .neural-loader{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 0 36px;text-align:center;color:var(--color-primary)}
  svg{display:block;width:min(960px,100%);height:auto;opacity:.15}
  .connection{stroke:currentColor;stroke-width:1;opacity:.25}
  .signal{stroke:currentColor;stroke-width:1.7;stroke-dasharray:12 250;stroke-dashoffset:262;animation:neural-flow 2.8s linear infinite}
  .node{fill:var(--color-base-200);stroke:currentColor;stroke-width:2;animation:neural-node 2.8s ease-in-out infinite}
  .halo{fill:currentColor;opacity:.05;transform-box:fill-box;transform-origin:center;animation:neural-halo 2.8s ease-out infinite}
  @keyframes neural-flow{to{stroke-dashoffset:0}}
  @keyframes neural-node{30%{fill:currentColor;filter:drop-shadow(0 0 5px currentColor)}}
  @keyframes neural-halo{30%{opacity:.3;transform:scale(1.25)}70%,100%{opacity:.02;transform:scale(1)}}
</style>
