const {app,BrowserWindow,dialog,shell,Menu,ipcMain}=require('electron');
const {menuTemplate}=require('./menu.cjs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

let window,workspace,quitting=false;
// The desktop service belongs to this app, never to an existing browser workspace.
if(!app.requestSingleInstanceLock())app.quit();
else {
  app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
  app.on('before-quit',event=>{
    if(quitting||!workspace)return;
    event.preventDefault();quitting=true;
    workspace.shutdown().finally(()=>app.quit());
  });
  app.on('window-all-closed',()=>app.quit());
  app.whenReady().then(start).catch(error=>{
    dialog.showErrorBox('OhMyPi-UI could not start',error.message+'\n\nClose another desktop instance if port 4322 is already in use.');
    app.quit();
  });
}

async function start(){
  app.setAppUserModelId('com.bitnosis.ohmypiui');
  // GUI apps on macOS/Linux do not inherit an interactive shell's PATH.
  const home=app.getPath('home');
  process.env.PATH=[path.join(home,'.local','bin'),path.join(home,'.bun','bin'),'/opt/homebrew/bin','/usr/local/bin',process.env.PATH||''].join(path.delimiter);
  process.env.PORT='4322';
  process.env.OMP_WEB_DEFAULT_CWD=home;
  process.env.OMP_WEB_DATA_DIR=path.join(app.getPath('userData'),'workspace');
  workspace=await import(pathToFileURL(path.join(__dirname,'..','server.mjs')).href);
  const origin=await workspace.ready;
  workspace.server.once('close',()=>{if(!quitting)app.quit();});
  window=new BrowserWindow({width:1380,height:940,minWidth:780,minHeight:600,title:'OhMyPi-UI',backgroundColor:'#1b1713',show:false,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  const send=action=>window.webContents.send('workspace-menu-action',action);
  const about=()=>dialog.showMessageBox(window,{type:'info',message:'OhMyPi-UI',detail:'Desktop workspace for your locally installed OhMyPi.\nVersion '+app.getVersion()});
  const updateMenu=state=>Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(state,send,()=>window.close(),about)));
  updateMenu();
  ipcMain.on('workspace-menu-state',(event,state)=>{
    if(event.sender!==window.webContents||event.senderFrame!==window.webContents.mainFrame||event.senderFrame.url!==origin+'/')return;
    if(!state||typeof state!=='object')return;
    updateMenu({ready:state.ready===true,busy:state.busy===true,hasSession:state.hasSession===true,hasFolder:state.hasFolder===true,canStart:state.canStart===true,view:typeof state.view==='string'?state.view:'',chatDensity:['compact','super-compact'].includes(state.chatDensity)?state.chatDensity:'standard'});
  });
  window.webContents.session.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  window.webContents.session.setPermissionCheckHandler(()=>false);
  function external(url){
    try{const parsed=new URL(url);if(['https:','http:'].includes(parsed.protocol))shell.openExternal(parsed.href).catch(()=>{});}catch{}
  }
  window.webContents.setWindowOpenHandler(({url})=>{external(url);return {action:'deny'};});
  window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin){event.preventDefault();external(url);}});
  window.once('ready-to-show',()=>window.show());
  window.on('close',event=>{
    if(quitting)return;
    const choice=dialog.showMessageBoxSync(window,{type:'question',buttons:['Keep open','Quit'],defaultId:0,cancelId:0,title:'Quit OhMyPi-UI?',message:'Quit the workspace and stop its running agents?',detail:'Saved conversations remain available when you reopen the app.'});
    if(choice===0)event.preventDefault();
  });
  await window.loadURL(origin);
}
