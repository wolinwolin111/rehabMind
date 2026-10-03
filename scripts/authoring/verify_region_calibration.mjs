import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolveAssessment} from '../../api/resolver.mjs';
const batch=Number(process.argv.find(a=>a.startsWith('--batch='))?.split('=')[1]||3);
const current=JSON.parse(await fs.readFile('build/knowledge/runtime.json','utf8'));
const before=JSON.parse(await fs.readFile('build/authoring/backups/region-calibration-20261002/runtime.json','utf8'));
const spec=JSON.parse(await fs.readFile('knowledge/review/region_calibration_v1.json','utf8'));
const effective={main:{},extension:{}};
for(const b of spec.batches.filter(b=>b.batch<=batch))for(const section of ['main','extension'])for(const [sheet,records]of Object.entries(b[section]))for(const [id,patch]of Object.entries(records))Object.assign(((effective[section][sheet]??={})[id]??={}),patch);
let edits=0,additions=0,checks=0;
for(const [section,key]of [['main','tables'],['extension','clinical_extension']]){
 for(const [sheet,rows]of Object.entries(current[key])){
  const old=before[key][sheet];if(!Array.isArray(rows)||!Array.isArray(old))continue;
  const idKey=Object.keys(rows[0])[0],oldById=new Map(old.map(r=>[r[idKey],r]));
  assert.equal(new Set(rows.map(r=>r[idKey])).size,rows.length,`Duplicate ${sheet}`);
  for(const prev of old)assert.ok(rows.some(r=>r[idKey]===prev[idKey]),`Deleted ${sheet}/${prev[idKey]}`);
  for(const r of rows){
   const id=r[idKey],prev=oldById.get(id),patch=effective[section][sheet]?.[id];
   if(!prev){assert.ok(patch?.[idKey]===id,`Unplanned new ${sheet}/${id}`);additions++;}
   else for(const [field,value]of Object.entries(r))if(JSON.stringify(value)!==JSON.stringify(prev[field])){
    assert.ok(patch&&field in patch,`Unplanned ${sheet}/${id}/${field}`);
    assert.deepEqual(value,patch[field],`${sheet}/${id}/${field}`);edits++;
   }
  }
 }
 for(const [sheet,records]of Object.entries(effective[section]))for(const [id,patch]of Object.entries(records)){
  const r=current[key][sheet].find(r=>Object.values(r)[0]===id);assert.ok(r,id);
  for(const [field,value]of Object.entries(patch)){assert.deepEqual(r[field],value,`${sheet}/${id}/${field}`);checks++;}
 }
}
const locations=current.clinical_extension.LocationGuide;
let queries=0;
for(const r of current.tables['01_Region']){const result=resolveAssessment(current,{region_id:r.region_id});assert.ok(result.dimensions.length);queries++;}
for(const g of locations){
 const result=resolveAssessment(current,{localization_area_id:g.Area_ID});queries++;
 const items=result.dimensions.flatMap(d=>d.groups.flatMap(group=>group.items));
 for(const id of g.Primary_Item_IDs.split('|')){
  const item=items.find(i=>i.item_id===id);assert.ok(item,`${g.Area_ID}/${id}`);
  assert.equal(item.display_mode,'DEFAULT',`${g.Area_ID}/${id} primary hidden`);
  assert.ok(item.possible_findings.length,`${g.Area_ID}/${id} has no finding`);
 }
 assert.ok(result.consultation_guide.length,`${g.Area_ID} lost consultation`);
 assert.ok(result.related_tissues.length,`${g.Area_ID} lost tissue list`);
 for(const d of result.dimensions){
  const all=d.groups.flatMap(g=>g.items);assert.equal(new Set(all.map(i=>i.item_id)).size,all.length,`${g.Area_ID}/${d.key} duplicates`);
 }
}
const report={batch,edited_existing_fields:edits,new_location_records:additions,expected_fields_checked:checks,queries,unplanned_changes:0};
await fs.writeFile(`knowledge/review/region_calibration_batch${batch}_verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
