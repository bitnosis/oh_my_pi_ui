import {spawn, spawnSync} from 'node:child_process';
import {existsSync, statSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';

export function findOmp() {
  if (process.env.OMP_COMMAND) return process.env.OMP_COMMAND;
  const search = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['omp'], {encoding:'utf8',windowsHide:true});
  const found = search.stdout?.trim().split(/\r?\n/).find(p => p && (process.platform !== 'win32' || /\.(exe|cmd)$/i.test(p)));
  if (found) return found;
  const candidates = process.platform === 'win32' ? [join(process.env.LOCALAPPDATA || join(homedir(),'AppData','Local'),'omp','omp.exe'),join(homedir(),'.bun','bin','omp.exe'),join(homedir(),'.bun','bin','omp.cmd')] : [join(homedir(),'.local','bin','omp'),join(homedir(),'.bun','bin','omp')];
  return candidates.find(p => existsSync(p) && statSync(p).isFile());
}

export function spawnOmp(args, options = {}) {
  const executable = findOmp();
  if (!executable) throw new Error('OhMyPi was not found. Install it or set OMP_COMMAND to its executable path, then reopen this app.');
  if (process.platform === 'win32' && /\.cmd$/i.test(executable)) {
    // npm/bun shims require cmd.exe. Reject cmd metacharacters rather than interpolate untrusted shell syntax.
    if ([executable,...args].some(a => /["&|<>^%!\r\n]/.test(a))) throw new Error('This operation needs the standalone omp.exe on Windows; the installed command shim cannot safely accept these characters. Set OMP_COMMAND to omp.exe.');
    return spawn(process.env.ComSpec || 'cmd.exe',['/d','/s','/c',`""${executable}" ${args.map(a=>'"'+a+'"').join(' ')}"`],{windowsHide:true,...options,windowsVerbatimArguments:true});
  }
  return spawn(executable,args,{windowsHide:true,...options});
}

export function runProcess(command, args, {cwd, timeout=30000, limit=8*1024*1024, env} = {}) {
  return capture(spawn(command,args,{cwd,env,windowsHide:true}),{timeout,limit});
}

export function runOmp(args, {cwd, profile='default', timeout=30000, limit=8*1024*1024} = {}) {
  return capture(spawnOmp(profile === 'default' ? args : ['--profile',profile,...args],{cwd}),{timeout,limit});
}

function capture(child, {timeout,limit}) {
  return new Promise((resolve,reject) => {
    let stdout='',stderr='',settled=false;
    const finish = (error,value) => {if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(value);};
    const timer = setTimeout(()=>{child.kill();finish(new Error('The operation timed out.'));},timeout);
    child.stdout.on('data',d=>{stdout+=d;if(Buffer.byteLength(stdout)>limit){child.kill();finish(new Error('Output exceeded the size limit.'));}});
    child.stderr.on('data',d=>{stderr=(stderr+d).slice(-16000);});
    child.on('error',e=>finish(e));
    child.on('close',code=>finish(code ? new Error((stderr||stdout||'The command failed.').replace(/\x1b\[[0-9;]*m/g,'').slice(-4000)) : null,{stdout,stderr}));
    child.stdin.end();
  });
}

export function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode) return;
  child.stdin.end();
  const timer=setTimeout(()=>{
    if(child.exitCode!==null || child.signalCode)return;
    if(process.platform==='win32')spawn('taskkill.exe',['/pid',String(child.pid),'/t','/f'],{windowsHide:true});
    else child.kill('SIGTERM');
  },3000);timer.unref();
}
