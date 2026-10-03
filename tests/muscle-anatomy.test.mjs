import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {transform} from 'esbuild';
const {code}=await transform(readFileSync(new URL('../src/content/lower-limb-anatomy.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
const {getMuscleAnatomy,lowerLimbAnatomy,supplementalMuscles}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const parts=JSON.parse(readFileSync(new URL('../public/3d/skin.json',import.meta.url))).muscles.parts;
// Source atlas packs the lower-limb group contiguously, before the pectoral group.
const start=parts.findIndex(p=>/First lumbrical of right foot/i.test(p.name));
const end=parts.findIndex(p=>/Abdominal part of right pectoralis/i.test(p.name));
test('all lower-limb atlas parts map to complete facts, including side names inside muscle names',()=>{
 assert.ok(start>=0&&end>start);
 const group=[...parts.slice(start,end),...parts.filter(p=>p.id.startsWith('ZA-')&&getMuscleAnatomy(p.name))];assert.ok(group.length>100);
 for(const p of group){const facts=getMuscleAnatomy(p.name);assert.ok(facts,p.name);for(const f of ['origin','insertion','action'])assert.ok(facts[f]?.trim(),p.name+'/'+f);}
 const names=new Set(group.map(p=>p.name.replace(/\b(left|right)\s+/gi,'').toLowerCase()));
 assert.deepEqual(new Set(Object.keys(lowerLimbAnatomy)),new Set([...names,...supplementalMuscles.map(p=>p.name)]));
 console.log({lowerLimbParts:group.length,anatomyEntries:names.size});
});
test('remaining model-absent teaching entry has facts without claiming an atlas mesh',()=>{
 assert.equal(supplementalMuscles.length,1);
 assert.equal(supplementalMuscles[0].name,'articularis genu');
 for(const muscle of supplementalMuscles){
   assert.ok(!parts.some(p=>p.name.replace(/\b(left|right)\s+/gi,'').toLowerCase()===muscle.name));
   const facts=getMuscleAnatomy(muscle.name);
   for(const field of ['origin','insertion','action'])assert.ok(facts[field]?.trim(),muscle.name+'/'+field);
 }
});
test('different heads and hand/foot homonyms remain distinct',()=>{
 assert.notEqual(getMuscleAnatomy('Long head of right biceps femoris').origin,getMuscleAnatomy('Short head of right biceps femoris').origin);
 assert.notEqual(getMuscleAnatomy('Medial head of left gastrocnemius').origin,getMuscleAnatomy('Lateral head of left gastrocnemius').origin);
 assert.ok(getMuscleAnatomy('Abductor digiti minimi of left foot'));
 assert.equal(getMuscleAnatomy('Abductor digiti minimi of left hand'),null);
 assert.equal(getMuscleAnatomy('Right rectus abdominis'),null);
});
