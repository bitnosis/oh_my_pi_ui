import {writeFileSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(process.platform==='win32'){console.log('Double-click Start OhMyPi.vbs in '+root);}
else{
  const quote=value=>'"'+value.replace(/[\\"`$]/g,c=>'\\'+c)+'"';
  const text='[Desktop Entry]\nType=Application\nName=OhMyPi Workspace\nComment=Launch your local coding agent workspace\nExec='+quote(process.execPath)+' '+quote(join(root,'launch.mjs'))+'\nPath='+root+'\nTerminal=false\nCategories=Development;\n';
  const target=join(root,'OhMyPi.desktop');writeFileSync(target,text);chmodSync(target,0o755);chmodSync(join(root,'Start OhMyPi.sh'),0o755);
  console.log('Created '+target+'. Your desktop may ask you to mark this launcher as trusted.');
}
