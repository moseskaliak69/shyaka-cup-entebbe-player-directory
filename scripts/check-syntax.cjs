const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
for(const file of fs.readdirSync(root).filter(name=>name.endsWith('.js'))){
 const result=spawnSync(process.execPath,['--check',path.join(root,file)],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
 if(!match[1].trim())continue;
 const result=spawnSync(process.execPath,['--check'],{input:match[1],encoding:'utf8'});
 if(result.status!==0){process.stderr.write(result.stderr);process.exit(result.status||1)}
}
console.log('JavaScript files and inline application scripts pass syntax checks.');
