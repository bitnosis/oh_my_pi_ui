import {workspace,api} from './workspace.svelte.js';
import {createCatalogCache,catalogKey} from './catalog-cache.js';
export const catalogStore=$state({entries:{}});
let storage;try{storage=globalThis.localStorage;}catch{}
const cache=createCatalogCache(catalogStore,{storage});
export function catalogScope(){return {folder:workspace.folder,profile:workspace.profile||'default',connectionId:workspace.active?.id,ready:workspace.active?.ready&&!workspace.active?.closed};}
const empty={models:[],agents:[],roles:{},warnings:[],providers:[],levels:[],loaded:{},loading:{},errors:{}};
export function currentCatalog(){return catalogStore.entries[catalogKey(catalogScope())]||empty;}
export async function refreshCatalog({force=false,resources=['models','definitions'],scope=catalogScope()}={}){
  const requests=[];
  for(const resource of resources){
    if(!scope.folder||!workspace.connected)continue;
    if(resource==='definitions')requests.push(cache.load(scope,resource,async()=>{
      const data=await api('/api/agent-definitions',{folder:scope.folder,profile:scope.profile});
      if(!Array.isArray(data.agents)||!data.roles)throw Error('Incomplete agent catalog.');
      return {agents:data.agents,roles:data.roles,warnings:data.warnings||[]};
    },{force}));
    else if(scope.ready&&scope.connectionId){
      const command={models:'get_available_models',providers:'get_login_providers',levels:'get_available_thinking_levels'}[resource];
      if(command)requests.push(cache.load(scope,resource,()=>api('/api/rpc',{connectionId:scope.connectionId,command:{type:command}}),{force,tag:scope.connectionId}));
    }
  }
  const results=await Promise.allSettled(requests);const error=results.find(result=>result.status==='rejected');if(error)throw error.reason;
  return cache.get(scope);
}
export function invalidateCatalog(resource='definitions',scope=catalogScope()){
  // A profile edit can affect every project using it, not just the open tab.
  for(const key of Object.keys(catalogStore.entries)){
    const [profile,folder]=JSON.parse(key);if(profile===scope.profile)cache.invalidate({profile,folder},resource);
  }
  cache.invalidate(scope,resource);
}
