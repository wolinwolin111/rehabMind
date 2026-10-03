import {readFile,writeFile,readdir,unlink,rm,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

const root=path.resolve('build/web');
// Only generated build output is modified; imported source documents and
// local anatomy authoring resources remain available in the working tree.
const target=relative=>{
 const absolute=path.resolve(root,relative);
 if(!absolute.startsWith(root+path.sep))throw new Error(`Asset outside web output: ${relative}`);
 return absolute;
};
const files=async relative=>{
 const entries=await readdir(target(relative),{withFileTypes:true}),result=[];
 for(const entry of entries){const name=path.posix.join(relative,entry.name);if(entry.isDirectory())result.push(...await files(name));else result.push(name);}
 return result;
};
const report={removed:[],deduplicated:[],savedBytes:0};
for(const relative of ['3d/features.pack','3d/attachment-trial.json','style-demo.html','design-preview']){
 const file=target(relative);
 try{const info=await stat(file);if(info.isDirectory()){
  for(const child of await files(relative))report.savedBytes+=(await stat(target(child))).size;
  await rm(file,{recursive:true});
 }else{report.savedBytes+=info.size;await unlink(file);}
 report.removed.push(relative);
 }catch(error){if(error.code!=='ENOENT')throw error;}
}
const all=await files('postop'),groups=new Map();
for(const file of all.filter(file=>/\.(webp|png|jpe?g|svg)$/i.test(file))){
 const hash=createHash('sha256').update(await readFile(target(file))).digest('hex');
 if(!groups.has(hash))groups.set(hash,[]);groups.get(hash).push(file);
}
const replacements=new Map();
for(const group of groups.values()){
 group.sort((a,b)=>a.length-b.length||a.localeCompare(b));
 for(const duplicate of group.slice(1))replacements.set(duplicate,group[0]);
}
const references=/\b(src|href)\s*=\s*(["'])([^"']*)\2/gi;
const local=(file,url)=>{
 if(/^(?:#|[a-z]+:|\/\/)/i.test(url))return;
 return path.posix.normalize(path.posix.join(path.posix.dirname(file),decodeURIComponent(url.split(/[?#]/)[0])));
};
for(const file of all.filter(file=>file.endsWith('.html'))){
 const source=await readFile(target(file),'utf8');
 const updated=source.replace(references,(full,attribute,quote,url)=>{
  const shared=replacements.get(local(file,url));if(!shared)return full;
  const suffix=url.match(/[?#].*$/)?.[0]??'';
  return `${attribute}=${quote}${path.posix.relative(path.posix.dirname(file),shared)}${suffix}${quote}`;
 });
 if(updated!==source)await writeFile(target(file),updated);
}
for(const [duplicate,shared] of replacements){
 report.savedBytes+=(await stat(target(duplicate))).size;await unlink(target(duplicate));report.deduplicated.push({duplicate,shared});
}
// Verify every local document asset after rewriting and removing duplicates.
for(const file of all.filter(file=>file.endsWith('.html'))){
 const html=await readFile(target(file),'utf8');
 for(const match of html.matchAll(references)){const reference=local(file,match[3]);if(reference)await stat(target(reference));}
}
await writeFile('build/web-asset-optimization.json',JSON.stringify(report,null,2));
console.log('Web asset cleanup:',JSON.stringify(report));
