export function messageText(message) {
  return typeof message?.content === 'string' ? message.content : (message?.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
}

// A pure event reducer also handles transcript replay after browser refreshes.
export function reduceEvent(state, event) {
  const next = { ...state, messages: [...state.messages] };
  const add = (role, text) => {
    const id = next.nextId++;
    next.messages.push({ id, role, text });
    return id;
  };
  if (event.type === 'reset') return { ...next, messages: [], currentId: null, nextId: 0 };
  if (event.type === 'hydrate') {
    next.messages=[];next.nextId=0;next.currentId=null;
    for(const message of event.messages||[]){
      if(['user','assistant'].includes(message.role)){
        const id=add(message.role,messageText(message));
        next.messages.find(m=>m.id===id).thinking=(message.content||[]).filter?.(c=>c.type==='thinking').map(c=>c.thinking||c.text||'').join('\n')||'';
      } else if(message.role==='toolResult'){
        const id=add('tool',(message.toolName||'Tool')+' completed');
        next.messages.find(m=>m.id===id).result=messageText(message);
      }
    }
    return next;
  }
  if (event.type === 'user_message') { next.currentId = null; add('user', event.text); }
  if (event.type === 'message_start' && event.message?.role === 'assistant') next.currentId = add('assistant', '');
  if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
    if (next.currentId === null) next.currentId = add('assistant', '');
    next.messages = next.messages.map(m => m.id === next.currentId ? { ...m, text: m.text + event.assistantMessageEvent.delta } : m);
  }
  if(event.type==='message_update'&&event.assistantMessageEvent?.type==='thinking_delta'){
    if(next.currentId===null)next.currentId=add('assistant','');
    next.messages=next.messages.map(m=>m.id===next.currentId?{...m,thinking:(m.thinking||'')+event.assistantMessageEvent.delta}:m);
  }
  if (event.type === 'message_end' && event.message?.role === 'assistant') {
    const text = messageText(event.message);
    if (text) {
      if (next.currentId === null) next.currentId = add('assistant', '');
      next.messages = next.messages.map(m => m.id === next.currentId ? { ...m, text } : m);
    }
    if (event.message.errorMessage) add('error', event.message.errorMessage);
    next.currentId = null;
  }
  if (event.type === 'tool_execution_start') {
    const id=add('tool', `Running ${event.toolName}…`);
    Object.assign(next.messages.find(m=>m.id===id),{toolCallId:event.toolCallId,details:JSON.stringify(event.args||{},null,2)});
  }
  if(event.type==='tool_execution_end')next.messages=next.messages.map(m=>m.toolCallId&&m.toolCallId===event.toolCallId?{...m,text:m.text.replace('Running ','Finished ').replace('…',''),result:messageText(event.result)}:m);
  if (event.type === 'tool_execution_end' && event.isError) add('error', messageText(event.result) || 'A tool reported an error.');
  if(event.type==='command_output')add('assistant',event.text||event.output||event.content||'Command completed.');
  if (event.type === 'prompt_result' && event.status === 'error') add('error', event.error?.message || 'OhMyPi could not complete the request.');
  return next;
}

export const emptyConversation = () => ({ messages: [], currentId: null, nextId: 0 });
