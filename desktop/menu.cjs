function menuTemplate(state={},send,quit,about,platform=process.platform){
  const action=(label,id,accelerator,enabled=true)=>({label,accelerator,enabled,click:()=>send(id)});
  const ready=Boolean(state.ready),idle=ready&&!state.busy;
  const views=[['chat','Conversation'],['tree','Conversation tree'],['agents','Agents'],['models','Models & providers'],['files','Files'],['worktrees','Worktrees'],['git','Git'],['settings','Settings'],['mcp','MCP servers'],['packages','Plugins & skills']];
  return [
    ...(platform==='darwin'?[{label:'OhMyPi-UI',submenu:[{label:'About OhMyPi-UI',click:about},{type:'separator'},action('Settings…','view:settings','CmdOrCtrl+,'),{type:'separator'},{role:'services'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{label:'Quit OhMyPi-UI',accelerator:'CmdOrCtrl+Q',click:quit}]}]:[]),
    {label:'Session',submenu:[
      action('New session','new','CmdOrCtrl+N',Boolean(state.canStart)),
      action('Add project…','project','CmdOrCtrl+O'),
      action('Search saved sessions','search','CmdOrCtrl+Shift+F'),
      action('Refresh sessions','refresh','F5'),
      {type:'separator'},action('Rename session…','rename','F2',ready),
      action('Fork session','fork','CmdOrCtrl+Shift+N',idle),
      action('Compact conversation','compact',undefined,idle),
      action('Cost Breakdown…','costs','CmdOrCtrl+Shift+B',ready),
      action('Stop response','stop','CmdOrCtrl+Shift+.',ready&&Boolean(state.busy)),
      action('Close session','close','CmdOrCtrl+Shift+W',Boolean(state.hasSession)),
      ...(platform==='darwin'?[]:[{type:'separator'},{label:'Quit OhMyPi-UI',accelerator:'Alt+F4',click:quit}])
    ]},
    {role:'editMenu'},
    {label:'Workspace',submenu:[
      ...views.map(([id,label],index)=>({...action(label,'view:'+id,id==='settings'?'CmdOrCtrl+,':index<9?'CmdOrCtrl+'+(index+1):undefined,['tree','models'].includes(id)?ready:['agents','files','worktrees','git','mcp'].includes(id)?Boolean(state.hasFolder):true),type:'checkbox',checked:state.view===id})),
      {type:'separator'},action('OhMyPi commands…','commands','CmdOrCtrl+Shift+P',ready),action('Focus message','compose','CmdOrCtrl+L',ready)
    ]},
    {label:'Appearance',submenu:[action('Choose theme…','themes','CmdOrCtrl+Shift+T'),action('Custom color…','color'),action('Toggle custom light / dark','mode'),{type:'separator'},{label:'Chat spacing',submenu:['standard','compact','super-compact'].map(value=>({...action(value==='super-compact'?'Super compact':value==='compact'?'Compact':'Standard','density:'+value),type:'radio',checked:(state.chatDensity||'standard')===value}))},{type:'separator'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]},
    {role:'windowMenu'},
    {label:'Help',submenu:[{label:'About OhMyPi-UI',click:about},{type:'separator'},{role:'toggleDevTools'}]}
  ];
}
module.exports={menuTemplate};

