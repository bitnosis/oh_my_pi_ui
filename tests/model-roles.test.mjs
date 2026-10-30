import {test} from 'node:test';
import assert from 'node:assert/strict';
import {promises as fs} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {modelRoleSettings,saveModelRole} from '../server/agent-catalog.mjs';
import {rolesForModels,assigneesFor} from '../src/lib/model-agents.js';
test('role assignment saves one native role without replacing other settings and rejects stale writes',async t=>{
  const folder=await fs.mkdtemp(join(tmpdir(),'omp-model-roles-'));t.after(()=>fs.rm(folder,{recursive:true,force:true}));
  await fs.mkdir(join(folder,'.omp'));await fs.writeFile(join(folder,'.omp','config.yml'),'# Keep\nextendedContext: true\nmodelRoles:\n  vision: other/model\n');
  const args={folder,scope:'project'};let state=await modelRoleSettings(args);const revision=state.revision;
  state=await saveModelRole({...args,role:'smol',model:'provider/fast',revision});assert.deepEqual(state.roles,{vision:'other/model',smol:'provider/fast'});
  await assert.rejects(saveModelRole({...args,role:'task',model:'provider/task',revision}),/changed/);
  state=await saveModelRole({...args,role:'smol',model:null,revision:state.revision});assert.deepEqual(state.roles,{vision:'other/model'});
  assert.match(await fs.readFile(join(folder,'.omp','config.yml'),'utf8'),/# Keep\nextendedContext: true/);
  await assert.rejects(saveModelRole({...args,role:'__proto__',model:'x',revision:state.revision}),/valid model role/);
});
test('role chips resolve explicit models and role aliases without inventing native defaults',()=>{
  const models=[{provider:'p',id:'fast'},{provider:'q',id:'slow'}];
  const assigned=rolesForModels(models,{smol:'p/fast',task:'@smol',vision:'q/slow'});
  assert.deepEqual(assigneesFor(models[0],assigned).map(r=>r.name),['smol','task']);
  assert.deepEqual(assigneesFor(models[1],assigned).map(r=>r.name),['vision']);
});
