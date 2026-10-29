import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,symlink,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {FrameDecoder} from '../server/rpc.mjs';
import {runProcess} from '../server/platform.mjs';
process.env.OMP_WEB_DATA_DIR=await mkdtemp(join(tmpdir(),'omp-test-data-'));
const {safeProjectPath,readSessionMetadata,worktrees,addWorktree,removeWorktree,saveMcp,mcpConfig}=await import('../server/storage.mjs');

test('lossless chunks preserve UTF-8 and reject inconsistent byte sequences',()=>{
  const bytes=Buffer.from(JSON.stringify({type:'message_end',text:'Hello ☕ 世界'}));const decoder=new FrameDecoder();
  const parts=[bytes.subarray(0,47),bytes.subarray(47)];let result;
  parts.forEach((part,index)=>{result=decoder.decode(JSON.stringify({type:'rpc_chunk',chunkId:'chunk',index,count:2,byteLength:bytes.length,data:part.toString('base64')}));});
  assert.equal(result.text,'Hello ☕ 世界');
  const broken=new FrameDecoder();assert.throws(()=>broken.decode(JSON.stringify({type:'rpc_chunk',chunkId:'bad',index:1,count:2,byteLength:4,data:'YWJj'})),/order/);
});
test('file preview refuses path traversal and symlink escapes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'omp-files-')),project=join(dir,'project'),outside=join(dir,'outside');await mkdir(project);await mkdir(outside);await writeFile(join(outside,'private.txt'),'private');
  await assert.rejects(()=>safeProjectPath(project,'../outside/private.txt'),/outside/);
  await mkdir(join(project,'.env'));await assert.rejects(()=>safeProjectPath(project,'.env'),/private/);
  await symlink(outside,join(project,'escape'),process.platform==='win32'?'junction':'dir');await assert.rejects(()=>safeProjectPath(project,'escape/private.txt'),/outside/);
});
test('session title slot and header are discovered without touching credential databases',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'omp-session-')),path=join(dir,'session.jsonl');
  await writeFile(path,[{type:'title',title:'My saved title'},{type:'session',id:'123',cwd:dir,timestamp:'2026-01-01T00:00:00.000Z'}].map(JSON.stringify).join('\n')+'\n');
  const result=await readSessionMetadata(path);assert.equal(result.title,'My saved title');assert.equal(result.folder,dir);
});
test('MCP saves reject stale revisions and retain a usable configuration',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'omp-mcp-'));const before=await mcpConfig('default',dir,'project');
  const text=JSON.stringify({mcpServers:{test:{command:'example',args:[]}}});
  await saveMcp({profile:'default',folder:dir,scope:'project',text,revision:before.revision});
  await assert.rejects(()=>saveMcp({profile:'default',folder:dir,scope:'project',text:'{"mcpServers":{}}',revision:before.revision}),/changed/);
  assert.equal((await mcpConfig('default',dir,'project')).text,text);
});
test('session fallback title survives a large initial system/tool snapshot',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'omp-session-title-')),path=join(dir,'session.jsonl');
  await writeFile(path,[{type:'session',id:'large',cwd:dir},{type:'session_init',systemPrompt:'x'.repeat(70000)},{type:'message',message:{role:'user',content:[{type:'text',text:'Explain this project'}]}}].map(JSON.stringify).join('\n')+'\n');
  assert.equal((await readSessionMetadata(path)).title,'Explain this project');
});
test('git worktrees can be created and dirty worktrees cannot be removed',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'omp-git-')),project=join(dir,'repo');await mkdir(project);
  await runProcess('git',['init',project]);await runProcess('git',['-C',project,'-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','Initial']);
  // A local data directory avoids adding test projects to the user's app registry.
  const created=await addWorktree(project,'test-branch');assert.equal((await worktrees(project)).length,2);
  await writeFile(join(created.path,'untracked.txt'),'keep this');await assert.rejects(()=>removeWorktree(project,created.path));
  assert.equal(await readFile(join(created.path,'untracked.txt'),'utf8'),'keep this');
});
