import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogCache,catalogStorageKey} from '../src/lib/catalog-cache.js';
const scope={folder:'project-a',profile:'default'},model={id:'one',provider:'provider',name:'Model one',headers:{authorization:'do not persist'}};
const definitions={agents:[{name:'scout',description:'Scout',fields:{model:'@smol'}}],roles:{smol:'provider/one'},warnings:[]};
const pause=()=>new Promise(resolve=>setTimeout(resolve,10));
function storage(){const data=new Map();return {writes:0,getItem:key=>data.get(key)||null,setItem(key,value){this.writes++;data.set(key,value);}};}
test('catalog deduplicates requests, retains references and data during refresh/failure, and persists only changes',async()=>{
  let clock=1000,calls=0,finish;const state={entries:{}},disk=storage();
  const cache=createCatalogCache(state,{storage:disk,now:()=>clock,delay:0});
  const loader=()=>{calls++;return new Promise(resolve=>{finish=resolve;});};
  const a=cache.load(scope,'models',loader),b=cache.load(scope,'models',loader);await Promise.resolve();assert.equal(calls,1);
  finish({models:[model]});await Promise.all([a,b]);await pause();assert.equal(disk.writes,1);
  const original=cache.get(scope).models;
  await cache.load(scope,'models',async()=>{throw Error('should not fetch within freshness window');});
  clock+=61000;
  const refreshing=cache.load(scope,'models',loader);assert.equal(cache.get(scope).models,original);await Promise.resolve();finish({models:[model]});await refreshing;await pause();assert.equal(cache.get(scope).models,original);assert.equal(disk.writes,1);
  await assert.rejects(cache.load(scope,'models',async()=>{throw Error('offline');},{force:true}),/offline/);assert.equal(cache.get(scope).models,original);
  await assert.rejects(cache.load(scope,'models',async()=>({}),{force:true}),/incomplete/);assert.equal(cache.get(scope).models,original);
  assert.ok(!disk.getItem(catalogStorageKey).includes('authorization'));
  const restored=createCatalogCache({entries:{}},{storage:disk});assert.equal(restored.get(scope).models[0].id,'one');assert.equal(restored.get({...scope,profile:'another'}).models.length,0);
  cache.dispose();restored.dispose();
});
test('agent/role cache hydrates together; invalidation prevents an old fetch overwriting a save',async()=>{
  const disk=storage(),cache=createCatalogCache({entries:{}},{storage:disk,delay:0});
  await cache.load(scope,'definitions',async()=>definitions);await pause();
  const restored=createCatalogCache({entries:{}},{storage:disk});assert.deepEqual(restored.get(scope).roles,definitions.roles);assert.equal(restored.get(scope).agents[0].name,'scout');
  let finish;const old=cache.load(scope,'definitions',()=>new Promise(resolve=>{finish=resolve;}),{force:true});await Promise.resolve();
  cache.invalidate(scope,'definitions');const fresh=cache.load(scope,'definitions',async()=>({...definitions,roles:{smol:'provider/two'}}),{force:true});
  finish(definitions);await Promise.all([old,fresh]);assert.equal(cache.get(scope).roles.smol,'provider/two');
  cache.dispose();restored.dispose();
});
test('corrupt or blocked localStorage does not break an in-memory catalog',async()=>{
  for(const disk of [{getItem:()=>'{bad',setItem:()=>{throw Error('full');}},{getItem:()=>{throw Error('blocked');}}]){
    const cache=createCatalogCache({entries:{}},{storage:disk,delay:0});await cache.load(scope,'models',async()=>({models:[]}));await pause();assert.deepEqual(cache.get(scope).models,[]);cache.dispose();
  }
});
