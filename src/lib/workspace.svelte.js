import {emptyConversation,reduceEvent} from './conversation.js';
import {connectPreferences} from './preferences.svelte.js';

export const workspace=$state({
  connected:false,initialized:false,notice:'',toast:null,pending:0,overview:{projects:[],sessions:[],running:[],profiles:['default']},
  active:null,state:{},conversation:emptyConversation(),dialogs:[],links:[],view:'chat',folder:'',profile:'default',streamOnline:false,revision:0,
});
let token='',events,poll,selection=0,stopSync=()=>{};
export function showToast(message){workspace.toast={message};}
export async function api(path,data={}){
  const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-App-Token':token},body:JSON.stringify(data)});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'The operation failed.');return result;
}
export async function attempt(operation){workspace.notice='';workspace.pending++;try{return await operation();}catch(error){workspace.notice=error.message;return undefined;}finally{workspace.pending--;}}
export async function refresh(refreshSessions=false){workspace.overview=await api('/api/overview',{refresh:refreshSessions});}
export async function initialize(){
  let disposed=false;
  try{
    const response=await fetch('/config');if(!response.ok)throw new Error('The workspace service is unavailable.');token=(await response.json()).token;
    stopSync();stopSync=connectPreferences(token);
    workspace.connected=true;await refresh();
    try{workspace.folder=localStorage.getItem('omp-folder')||workspace.overview.projects[0]?.folder||'';}catch{}
    const previous=localStorage.getItem('omp-active-connection');const active=workspace.overview.running.find(c=>c.id===previous)||workspace.overview.running[0];
    if(active)await selectConnection(active);
    poll=setInterval(()=>{if(!disposed)refresh().catch(()=>{workspace.connected=false;});},6000);
  }catch(error){workspace.notice=error.message;}
  workspace.initialized=true;
  return ()=>{disposed=true;clearInterval(poll);events?.close();};
}
export function closeWorkspace(){clearInterval(poll);events?.close();stopSync();stopSync=()=>{};}
export async function rpc(type,fields={}){
  const id=workspace.active?.id;if(!id)throw new Error('Start or resume a session first.');
  const result=await api('/api/rpc',{connectionId:id,command:{type,...fields}});
  if(workspace.active?.id===id&&['new_session','fork','branch','navigate_tree','set_session_name'].includes(type))await refresh(true);
  return result;
}
export async function selectConnection(connection){
  events?.close();const current=++selection;
  workspace.active=connection;workspace.folder=connection.folder;workspace.profile=connection.profile;workspace.view='chat';workspace.state={};workspace.dialogs=[];workspace.links=[];workspace.conversation=emptyConversation();workspace.streamOnline=false;
  try{localStorage.setItem('omp-active-connection',connection.id);localStorage.setItem('omp-folder',connection.folder);}catch{}
  events=new EventSource('/api/events?token='+encodeURIComponent(token)+'&connectionId='+encodeURIComponent(connection.id));
  events.onopen=()=>{if(current===selection)workspace.streamOnline=true;};
  events.onerror=()=>{if(current===selection)workspace.streamOnline=false;};
  events.onmessage=({data})=>{
    if(current!==selection)return;
    const event=JSON.parse(data);workspace.conversation=reduceEvent(workspace.conversation,event);workspace.revision++;
    if(event.type==='status'){
      workspace.active={...workspace.active,...event};
      workspace.overview.running=workspace.overview.running.map(c=>c.id===connection.id?workspace.active:c);
    }
    if(event.type==='state'||(event.type==='response'&&event.command==='get_state'&&event.success))workspace.state=event.data||{};
    if(event.type==='queue_update')workspace.state={...workspace.state,queuedMessages:event.queuedMessages||event};
    if(event.type==='problem')workspace.notice=event.text;
    if(event.type==='notice')workspace.notice=event.message||event.text||'';
    if(event.type==='extension_ui_request'){
      if(['select','confirm','input','editor','ask'].includes(event.method))workspace.dialogs=[...workspace.dialogs.filter(d=>d.id!==event.id),event];
      if(event.method==='cancel')workspace.dialogs=workspace.dialogs.filter(d=>d.id!==event.targetId);
      if(event.method==='notify')workspace.notice=event.message||'';
      if(event.method==='set_editor_text')workspace.notice='An extension suggested draft text: '+(event.text||'');
      if(event.method==='open_url'){
        const url=event.launchUrl||event.url;
        if(/^https?:\/\//i.test(url||''))workspace.links=[...workspace.links,{url,instructions:event.instructions||'Open sign-in page'}];
      }
    }
    if(event.type==='connection_closed'){workspace.notice='This session has stopped. It remains saved in OhMyPi; select it to resume.';refresh(true).catch(()=>{});}
  };
}
export async function startSession(options={}){
  const result=await api('/api/start',{folder:workspace.folder,profile:workspace.profile,...options});await refresh(true);await selectConnection(result);return result;
}
export async function sendPrompt(message,streamingBehavior,images){
  if(!workspace.active)await startSession();
  return api('/api/prompt',{connectionId:workspace.active.id,message,streamingBehavior,images});
}
