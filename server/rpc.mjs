import {EventEmitter} from 'node:events';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {spawnOmp,stopProcess} from './platform.mjs';

// Validates lossless protocol-v2 chunks, including non-ASCII text split across byte boundaries.
export class FrameDecoder {
  pending=null;
  decode(line) {
    const frame=JSON.parse(line);
    if(frame.type!=='rpc_chunk') {
      if(this.pending){this.pending=null;throw new Error('Interrupted RPC chunk sequence.');}
      return frame;
    }
    if(!Number.isInteger(frame.index)||!Number.isInteger(frame.count)||!Number.isInteger(frame.byteLength)||frame.count<1||frame.count>100000||frame.byteLength<1||frame.byteLength>67108864||typeof frame.chunkId!=='string'||typeof frame.data!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(frame.data))throw new Error('Invalid RPC chunk.');
    if(!this.pending){if(frame.index!==0)throw new Error('RPC chunks arrived out of order.');this.pending={id:frame.chunkId,count:frame.count,bytes:frame.byteLength,parts:[],size:0};}
    const p=this.pending;
    if(p.id!==frame.chunkId||p.count!==frame.count||p.bytes!==frame.byteLength||p.parts.length!==frame.index){this.pending=null;throw new Error('Inconsistent RPC chunk sequence.');}
    const bytes=Buffer.from(frame.data,'base64');p.parts.push(bytes);p.size+=bytes.length;
    if(p.size>p.bytes){this.pending=null;throw new Error('RPC chunk exceeds advertised length.');}
    if(p.parts.length===p.count){this.pending=null;if(p.size!==p.bytes)throw new Error('Incomplete RPC frame.');return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(p.parts)));}
    return null;
  }
}

export class AgentConnection extends EventEmitter {
  id=randomUUID(); ready=false; busy=false; initializing=true; state={}; history=[]; historyBytes=0; pending=new Map(); dialogs=new Map(); closed=false;
  constructor({folder,profile='default',sessionPath,restore=false}) {
    super();this.folder=folder;this.profile=profile;this.sessionPath=sessionPath;this.startedAt=new Date().toISOString();
    const args=['--mode','rpc-ui','--no-pty'];
    if(profile!=='default')args.push('--profile',profile);
    if(sessionPath)args.push(restore?'--restore':'--resume',sessionPath);
    this.child=spawnOmp(args,{cwd:folder});
    const decoder=new FrameDecoder();
    createInterface({input:this.child.stdout}).on('line',line=>{try{const e=decoder.decode(line);if(e)this.handle(e);}catch(e){this.publish({type:'problem',text:e.message});}});
    this.child.stderr.on('data',data=>this.publish({type:'diagnostic',text:data.toString().slice(-8000)}));
    this.child.stdin.on('error',()=>{});
    this.child.on('error',error=>this.publish({type:'problem',text:error.message}));
    this.child.on('close',(code)=>{
      this.closed=true;this.ready=this.busy=false;
      for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('OhMyPi disconnected.'));}this.pending.clear();this.dialogs.clear();
      this.publish({type:'connection_closed',code});this.status();
    });
  }
  summary(){return {id:this.id,folder:this.folder,profile:this.profile,ready:this.ready&&!this.initializing,busy:this.busy,closed:this.closed,startedAt:this.startedAt,sessionFile:this.state.sessionFile||this.sessionPath,sessionId:this.state.sessionId,name:this.state.sessionName,model:this.state.model,dialogCount:this.dialogs.size};}
  status(){this.publish({type:'status',...this.summary()});}
  publish(event){
    const bytes=Buffer.byteLength(JSON.stringify(event));
    // Large completed snapshots are fetched from the paged transcript endpoint instead.
    if(event.type!=='response'){
      if(bytes<2*1024*1024){this.history.push({event,bytes});this.historyBytes+=bytes;while(this.historyBytes>12*1024*1024||this.history.length>3000){this.historyBytes-=this.history.shift().bytes;}}
    }
    this.emit('event',event);
  }
  write(command){if(this.closed||!this.child.stdin.writable)throw new Error('OhMyPi is not connected.');this.child.stdin.write(JSON.stringify(command)+'\n');}
  request(command,timeout=30000){
    if(!this.ready)return Promise.reject(new Error('OhMyPi is still starting.'));
    const id=randomUUID();
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('OhMyPi did not respond in time.'));},timeout);
      this.pending.set(id,{resolve,reject,timer});
      try{this.write({...command,id});}catch(error){clearTimeout(timer);this.pending.delete(id);reject(error);}
    });
  }
  handle(event){
    if(event.type==='ready'){
      this.ready=true;this.status();
      (async()=>{
        if(event.supportedProtocolVersions?.includes(2))await this.request({type:'negotiate_protocol',protocolVersion:2});
        await this.request({type:'set_ask_dialog',enabled:true}).catch(()=>{});
        await this.request({type:'set_subagent_subscription',level:'events'}).catch(()=>{});
        await this.refresh();
        await this.hydrate();
      })().catch(error=>this.publish({type:'problem',text:error.message})).finally(()=>{this.initializing=false;this.status();});
    }
    if(event.type==='response'){
      if(event.success&&event.command==='get_state'){this.state=event.data||{};this.busy=Boolean(this.state.isStreaming||this.state.hasPendingAsyncWork||this.state.isCompacting);this.status();}
      const p=this.pending.get(event.id);if(p){clearTimeout(p.timer);this.pending.delete(event.id);event.success?p.resolve(event.data||{}):p.reject(new Error(event.error||'OhMyPi refused the request.'));}
    }
    if(event.type==='agent_start'){this.busy=true;this.status();}
    if(event.type==='session_settled'||(event.type==='prompt_result'&&event.sessionSettled)){this.busy=false;this.status();this.refresh().catch(()=>{});}
    if(event.type==='extension_ui_request'){
      if(['confirm','select','input','editor','ask'].includes(event.method)){
        this.dialogs.set(event.id,event);
        if(event.timeout){const timer=setTimeout(()=>{if(this.dialogs.delete(event.id))this.publish({type:'extension_ui_request',method:'cancel',targetId:event.id});},event.timeout);timer.unref();}
      }
      if(event.method==='cancel')this.dialogs.delete(event.targetId);
    }
    this.publish(event);
  }
  async refresh(){if(this.ready&&!this.closed)await this.request({type:'get_state'});}
  async transcript(){
    const messages=[];let cursor;
    for(let page=0;page<1000;page++){
      let data;
      try{data=await this.request({type:'get_messages_page',limit:100,...(cursor?{cursor}:{})});}
      catch(error){if(page===0&&/unknown|unsupported/i.test(error.message)){const old=await this.request({type:'get_messages'});return old.messages||[];}throw error;}
      messages.push(...(data.messages||[]));cursor=data.nextCursor;if(!cursor)return messages;
    }
    throw new Error('This transcript is too large to load in one view.');
  }
  async hydrate(){
    const messages=await this.transcript();
    this.history=[];this.historyBytes=0;
    this.publish({type:'reset'});this.publish({type:'hydrate',messages});
  }
  answer(data){
    if(!this.dialogs.has(data.id))throw new Error('This question has expired or was already answered.');
    const frame={type:'extension_ui_response',id:data.id};
    if(data.cancelled)frame.cancelled=true;
    else if(typeof data.confirmed==='boolean')frame.confirmed=data.confirmed;
    else if(Array.isArray(data.answers))frame.answers=data.answers;
    else if(typeof data.value==='string')frame.value=data.value;
    else throw new Error('A question needs an answer.');
    this.write(frame);this.dialogs.delete(data.id);this.publish({type:'extension_ui_request',method:'cancel',targetId:data.id});
  }
  stop(){stopProcess(this.child);}
}
