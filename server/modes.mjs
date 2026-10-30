const terminalModes=['plan','vibe','loop'];
const nativeCommands={extended:'extended-context',skills:'skillful'};
export async function readModes(c){
  if(c.modeReadPromise)return c.modeReadPromise;
  c.modeReadPromise=(async()=>{
    await c.refresh();
    const modes={
      fast:{supported:true,enabled:Boolean(c.state.fastModeEnabled)},
      slow:{supported:c.state.slowModeSupported===true,enabled:Boolean(c.state.slowModeEnabled)},
      auto:{supported:true,enabled:Boolean(c.state.autoCompactionEnabled)},
    };
    for(const key of terminalModes)modes[key]={supported:false,enabled:null,reason:'This native OhMyPi mode is terminal-only and is not exposed through RPC.'};
    const {commands=[]}=await c.request({type:'get_available_commands'});
    for(const [key,command] of Object.entries(nativeCommands)){
      if(!commands.some(item=>item.name===command&&item.source==='builtin')){modes[key]={supported:false,enabled:null,reason:'Not supported by this installed OhMyPi version.'};continue;}
      if(c.busy||c.contextReportPending){modes[key]=c.cachedModes?.[key]||{supported:true,enabled:null,reason:'Available after the current response finishes.'};continue;}
      const text=await c.modeCommand(command,'status');
      const match=text.match(/\b(on|off|enabled|disabled)\b/i);
      modes[key]={supported:true,enabled:match?['on','enabled'].includes(match[1].toLowerCase()):null,reason:match?'':'OhMyPi did not return a recognizable mode status.'};
    }
    c.cachedModes=modes;return {modes};
  })();
  try{return await c.modeReadPromise;}finally{c.modeReadPromise=null;}
}
export async function setMode(c,key,enabled){
  if(typeof enabled!=='boolean')throw new Error('Choose on or off.');
  if(terminalModes.includes(key))throw new Error('This mode is only available in the native OhMyPi terminal.');
  if(!['extended','skills','fast','slow','auto'].includes(key))throw new Error('Unknown mode.');
  if(c.busy||c.initializing||c.contextReportPending||c.modeOutput)throw new Error('Wait for the current operation to finish before changing modes.');
  if(c.modeReadPromise)await c.modeReadPromise;
  if(c.busy||c.contextReportPending)throw new Error('Wait for the current operation to finish before changing modes.');
  let message='';
  if(nativeCommands[key]){
    const {commands=[]}=await c.request({type:'get_available_commands'});
    const command=nativeCommands[key];
    if(!commands.some(item=>item.name===command&&item.source==='builtin'))throw new Error('This OhMyPi version does not support that mode.');
    message=await c.modeCommand(command,enabled?'on':'off');
  }else{
    await c.request({type:{fast:'set_fast_mode',slow:'set_slow_mode',auto:'set_auto_compaction'}[key],enabled});
  }
  const result=await readModes(c);
  if(result.modes[key]?.enabled!==enabled)throw new Error(message||'OhMyPi could not apply that mode to the current model.');
  return {...result,message};
}
