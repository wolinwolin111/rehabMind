// Official Z-Anatomy PC-Version layer tables, downloaded to build/za-muscles-N.txt.
import fs from 'node:fs';
import {build} from 'esbuild';
const result=await build({entryPoints:['src/content/muscle-layers.ts'],bundle:true,write:false,format:'esm'});
const old=await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const layers=Array.from({length:9},(_,i)=>({level:i+1,names:fs.readFileSync(`build/za-muscles-${i+1}.txt`,'utf8').trim().split(/\r?\n/).slice(1).filter(Boolean)}));
function normalize(n){return old.muscleKey(n).replace(/\.[rlg]$/,'').replace(/[()]/g,'').replace(/\bmuscles?\b/g,'').replace(/\bset of\b/g,'').replace(/\s+/g,' ').trim();}
const alias={
 'external oblique':'external abdominal oblique','internal oblique':'internal abdominal oblique',
 'clavicular part of pectoralis major':'clavicular head of pectoralis major','sternocostal part of pectoralis major':'sternocostal head of pectoralis major',
 'spinal part of deltoid':'scapular spinal part of deltoid','ulnar head of pronator teres':'deep head of pronator teres','humeral head of pronator teres':'superficial head of pronator teres',
 'flexor digitorum superficialis':'humero-ulnar head of flexor digitorum superficialis',
 'extensor carpi ulnaris':'humeral head of extensor carpi ulnaris','flexor pollicis brevis':'deep head of flexor pollicis brevis',
 'flexor accessorius':'quadratus plantae','flexor digiti minimi brevis of foot':'flexor digiti minimi of foot',
 'flexor digiti minimi brevis of hand':'flexor digiti minimi of hand',
 'multifidus cervicis':'multifidus colli','iliocostalis cervicis':'iliocostalis colli','longissimus cervicis':'longissimus colli','spinalis cervicis':'spinalis colli','semispinalis cervicis':'semispinalis colli',
 'set of palmar interossei of hand':'palmar interossei','set of dorsal interossei of hand':'dorsal interossei of hand',
 'gemellus inferior':'inferior gemellus','gemellus superior':'superior gemellus',
 'obliquus capitis inferior':'obliquus inferior capitis','obliquus capitis superior':'obliquus superior capitis',
 'rectus capitis anterior':'rectus anterior capitis','rectus capitis lateralis':'rectus lateralis capitis',
 'rectus capitis posterior major':'rectus posterior major capitis','rectus capitis posterior minor':'rectus posterior minor capitis',
 'interspinalis thoracis':'interspinales thoracis','set of interspinales cervicis':'interspinales colli',
 'set of levatores costarum breves':'levatores breves costarum','set of levatores costarum longi':'levatores longi costarum',
 'set of lumbricals of hand':'lumbrical of hand','splenius cervicis':'splenius colli',
 'cervical rotator':'rotatores','lumbar rotator':'rotatores','thoracic rotator':'rotatores',
 'inferior oblique part of longus colli':'longus colli','superior oblique part of longus colli':'longus colli','vertical intermediate part of longus colli':'longus colli',
 'spinalis':'spinalis thoracis',
 'lateral lumbar intertransversarius':'dorsal parts of lateral intertransversarii lumborum',
};
// Structures absent as independent entries in this revision of the Z layer table.
const fallback={'semispinalis capitis':{depth:7,basis:'alongside semispinalis colli'},'medial lumbar intertransversarius':{depth:8,basis:'deep segmental lumbar muscle'},'set of anterior cervical intertransversarii':{depth:8,basis:'deep segmental cervical muscle'},'set of posterior cervical intertransversarii':{depth:8,basis:'deep segmental cervical muscle'},'puborectalis':{depth:8,basis:'deep pelvic floor muscle'}};
const source=new Map();for(const layer of layers)for(const n of layer.names)source.set(normalize(n),Math.max(source.get(normalize(n))??0,layer.level));
const parts=JSON.parse(fs.readFileSync('public/3d/skin.json')).muscles.parts;
const names=[...new Set(old.visibleMuscleParts(parts,'all',0).map(p=>old.muscleKey(p.name)))].sort();
const mappings={},unmapped=[];
for(const name of names){let k=normalize(alias[name]??name);
 k=k.replace(/^(first|second|third|fourth) lumbrical of foot$/,'lumbrical of foot');
 if(/lumbrical.*foot/.test(k))k='lumbrical of foot';
 if(/^(first|second|third|fourth) dorsal interosseous of foot$/.test(k))k='dorsal interossei of foot';
 if(/^(first|second|third) plantar interosseous of foot$/.test(k))k='plantar interossei';
 const level=source.get(k);
 if(level)mappings[name]={depth:9-level,level,sourceName:k};else if(fallback[name])mappings[name]=fallback[name];else unmapped.push(name);
}
fs.writeFileSync('build/za-layer-mapping.json',JSON.stringify({layers,mappings,unmapped},null,2));
if(unmapped.length===0)fs.writeFileSync('docs/reference/z-anatomy-layers.json',JSON.stringify({source:'https://github.com/LluisV/Z-Anatomy/tree/PC-Version/Z-Anatomy%20PC/Assets/Models/Layers/Muscles',license:'CC-BY-SA-4.0',attribution:'Z-Anatomy — Gauthier Kervyn, Marcin Zielinski, Lluis Vinent',retrieved:'2026-10-03',order:'Research reference only; not used for product peel steps',layers,mappings},null,2)+'\n');
console.log(JSON.stringify({mapped:Object.keys(mappings).length,unmapped},null,2));
