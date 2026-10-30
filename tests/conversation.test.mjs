import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyConversation,reduceEvent} from '../src/lib/conversation.js';
import {builtInThemes,chatBackgroundChoices,defaultChatBackground,defaultChatBackgroundId,themeBackground,themeBackgrounds,themeVariables} from '../src/lib/theme.js';

test('streamed response finishes without duplicated text; refresh replay is stable',()=>{
  const events=[
    {type:'user_message',text:'Describe this project'},
    {type:'message_start',message:{role:'assistant'}},
    {type:'message_update',assistantMessageEvent:{type:'text_delta',delta:'## Project'}},
    {type:'message_update',assistantMessageEvent:{type:'text_delta',delta:' overview'}},
    {type:'message_end',message:{role:'assistant',content:[{type:'text',text:'## Project overview'}]}},
  ];
  const state=events.reduce(reduceEvent,emptyConversation());
  assert.equal(state.messages.length,2);
  assert.equal(state.messages[1].text,'## Project overview');
  assert.deepEqual(events.reduce(reduceEvent,reduceEvent(state,{type:'reset'})),state);
});
test('tool failures and provider failures are visible',()=>{
  const state=[{type:'tool_execution_end',isError:true,result:{content:[{type:'text',text:'File not found'}]}},{type:'prompt_result',status:'error',error:{message:'Provider unavailable'}}].reduce(reduceEvent,emptyConversation());
  assert.deepEqual(state.messages.map(m=>m.text),['File not found','Provider unavailable']);
});
test('all theme roles share the chosen hue, including neutral white and black',()=>{
  assert.equal(themeVariables('invalid'),null);
  assert.match(themeVariables('#0000ff')['--color-base-100'],/^hsl\(240 /);
  assert.match(themeVariables('#0000ff')['--color-primary'],/^hsl\(240 /);
  for(const color of ['#ffffff','#000000'])assert.equal(themeVariables(color)['--color-base-100'],'hsl(0 0% 9%)');
  assert.equal(themeVariables('#000000')['--logo-start'],'hsl(28 0% 62%)');
});
test('chat backgrounds fall back to the chosen default logo',()=>{
  assert.equal(defaultChatBackgroundId,'leaf');
  assert.equal(chatBackgroundChoices.leaf.image,'/backgrounds/logo-leaf.svg');
  assert.equal(chatBackgroundChoices.leaf.tint,'var(--color-primary)');
  assert.equal(defaultChatBackground,chatBackgroundChoices.leaf);
  assert.deepEqual(themeBackground('dark'),defaultChatBackground);
  assert.deepEqual(themeBackground('custom'),defaultChatBackground);
  assert.deepEqual(themeBackground('halloween'),{image:'/backgrounds/halloween.png',opacity:0.15});
  assert.deepEqual(themeBackground('forest'),{image:'/backgrounds/forest.png',opacity:0.23});
  assert.deepEqual(themeBackground('synthwave'),{image:'/backgrounds/synthwave.png',opacity:0.1});
  assert.deepEqual(themeBackground('night'),{image:'/backgrounds/night.png',opacity:0.1});
  assert.deepEqual(themeBackground('emerald'),{image:'/backgrounds/emerald-crystals-light.png',opacity:0.2});
  assert.deepEqual(themeBackground('bumblebee'),{image:'/backgrounds/bumblebee.png',opacity:0.1});
  assert.deepEqual(themeBackground('coffee'),{image:'/backgrounds/coffee.png',opacity:0.1,position:'67% center'});
  assert.deepEqual(themeBackground('abyss'),{image:'/backgrounds/abyss.png',opacity:0.1});
  for(const name of Object.keys(themeBackgrounds))assert.ok(builtInThemes.includes(name));
});
