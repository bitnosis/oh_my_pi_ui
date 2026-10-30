const {contextBridge,ipcRenderer}=require('electron');
// Expose only menu events and display state, never the IPC object or Node APIs.
contextBridge.exposeInMainWorld('desktopMenu',{
  onAction(callback){
    const listener=(_event,action)=>callback(action);
    ipcRenderer.on('workspace-menu-action',listener);
    return ()=>ipcRenderer.removeListener('workspace-menu-action',listener);
  },
  updateState(state){ipcRenderer.send('workspace-menu-state',state);}
});
