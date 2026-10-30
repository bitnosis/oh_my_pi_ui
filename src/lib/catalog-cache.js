export const catalogStorageKey='omp-catalog-cache-v1';
const groups={models:['models'],definitions:['agents','roles','warnings'],providers:['providers'],levels:['levels']};
const modelFields=['id','provider','name','contextWindow','maxTokens','reasoning','input','cost'];
export const catalogKey=scope=>JSON.stringify([scope.profile||'default',scope.folder||'']);
const object=value=>value&&typeof value==='object'&&!Array.isArray(value);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function valid(resource,data){
  if(!object(data))return false;
  if(!groups[resource].every(key=>key==='roles'?object(data[key]):Array.isArray(data[key])))return false;
  if(resource==='models')return data.models.every(model=>object(model)&&typeof model.id==='string'&&typeof model.provider==='string');
  if(resource==='definitions')return data.agents.every(agent=>object(agent)&&typeof agent.name==='string'&&typeof agent.description==='string'&&object(agent.fields));
  return true;
}
export function createCatalogCache(state,{storage,now=Date.now,ttl=60000,delay=200}={}){
  const pending=new Map(),versions=new Map(),tags=new Map();let timer;
  function get(scope){
    const key=catalogKey(scope);
    if(!state.entries[key])state.entries[key]={models:[],agents:[],roles:{},warnings:[],providers:[],levels:[],loaded:{},loading:{},errors:{}};
    return state.entries[key];
  }
  try{
    const saved=JSON.parse(storage?.getItem(catalogStorageKey)||'null');
    if(saved?.version===1&&object(saved.entries))for(const [key,value] of Object.entries(saved.entries).slice(-8)){
      const scope=JSON.parse(key);if(!Array.isArray(scope)||scope.length!==2||!scope.every(v=>typeof v==='string'))continue;
      const entry=get({profile:scope[0],folder:scope[1]});
      for(const resource of ['models','definitions'])if(valid(resource,value)){
        for(const field of groups[resource])entry[field]=value[field];
        entry.loaded[resource]=Number(value.loaded?.[resource])||1;
      }
    }
  }catch{/* Corrupt or unavailable browser storage never prevents loading. */}
  function persist(){
    clearTimeout(timer);timer=setTimeout(()=>{
      try{
        const entries={};
        const recent=Object.entries(state.entries).sort(([,a],[,b])=>Math.max(...Object.values(a.loaded),0)-Math.max(...Object.values(b.loaded),0)).slice(-8);
        for(const [key,entry] of recent){
          const item={loaded:{}};
          if(entry.loaded.models){item.models=entry.models.map(model=>Object.fromEntries(modelFields.filter(field=>model[field]!==undefined).map(field=>[field,model[field]])));item.loaded.models=entry.loaded.models;}
          if(entry.loaded.definitions){item.agents=entry.agents;item.roles=entry.roles;item.warnings=entry.warnings;item.loaded.definitions=entry.loaded.definitions;}
          entries[key]=item;
        }
        const text=JSON.stringify({version:1,entries});
        if(text.length<2000000&&storage?.getItem(catalogStorageKey)!==text)storage?.setItem(catalogStorageKey,text);
      }catch{/* Keep the in-memory cache when storage is full or blocked. */}
    },delay);
  }
  function invalidate(scope,resource){const key=catalogKey(scope)+':'+resource;versions.set(key,(versions.get(key)||0)+1);get(scope).loaded[resource]=0;}
  async function load(scope,resource,loader,{force=false,tag=''}={}){
    const entry=get(scope),key=catalogKey(scope)+':'+resource,generation=versions.get(key)||0;
    const existing=pending.get(key);
    if(existing){if(existing.generation===generation)return existing.promise;await existing.promise.catch(()=>{});return load(scope,resource,loader,{force:true,tag});}
    if(!force&&entry.loaded[resource]&&now()-entry.loaded[resource]<ttl&&tags.get(key)===tag)return entry;
    entry.loading[resource]=true;entry.errors[resource]='';
    const promise=(async()=>{
      try{
        const result=await Promise.resolve().then(loader);if(!valid(resource,result))throw Error('The catalog response was incomplete. Cached data has been kept.');
        if((versions.get(key)||0)!==generation)return entry;
        let changed=false;
        for(const field of groups[resource])if(!equal(entry[field],result[field])){entry[field]=result[field];changed=true;}
        const first=!entry.loaded[resource];entry.loaded[resource]=now();tags.set(key,tag);
        if((changed||first)&&['models','definitions'].includes(resource))persist();
        return entry;
      }catch(e){if((versions.get(key)||0)===generation)entry.errors[resource]=e.message;throw e;}
      finally{entry.loading[resource]=false;if(pending.get(key)?.promise===promise)pending.delete(key);}
    })();pending.set(key,{promise,generation});return promise;
  }
  return {get,load,invalidate,dispose(){clearTimeout(timer);}};
}
