import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {resolveAssessment} from '../../api/resolver.mjs';
const batch=Number(process.argv.find(x=>x.startsWith('--batch='))?.split('=')[1]||1);
const d=JSON.parse(await fs.readFile('build/authoring/database-audit-snapshot.json','utf8'));
assert.deepEqual(d.audit_source.issues,[]);
const before=JSON.parse(await fs.readFile(`build/authoring/backups/static-batch${batch}-20261001/runtime.json`,'utf8'));
const currentSpec=JSON.parse(await fs.readFile(`knowledge/review/static_remediation_batch${batch}_v1.json`,'utf8'));
let changed=0,added=0,checked=0;
for(let n=1;n<=batch;n++){
 const spec=JSON.parse(await fs.readFile(`knowledge/review/static_remediation_batch${n}_v1.json`,'utf8'));
 for(const section of ['main','extension'])for(const[sheet,records]of Object.entries(spec[section]))for(const[id,fields]of Object.entries(records)){
  const tables=d[section==='main'?'tables':'clinical_extension'];
  const target=tables[sheet].find(r=>Object.values(r)[0]===id);assert.ok(target,`${sheet}/${id}`);
  // Later batches may deliberately supersede the same field.
  for(const[field,value]of Object.entries(fields)){
   let expected=value;for(let later=n+1;later<=batch;later++){const next=JSON.parse(await fs.readFile(`knowledge/review/static_remediation_batch${later}_v1.json`,'utf8'));if(next[section]?.[sheet]?.[id]&&field in next[section][sheet][id])expected=next[section][sheet][id][field];}
   assert.deepEqual(target[field],expected,`${sheet}/${id}/${field}`);checked++;
  }
 }
}
for(const section of ['main','extension']){
 const key=section==='main'?'tables':'clinical_extension';
 for(const[sheet,rows]of Object.entries(d[key])){
  if(!Array.isArray(rows)||!Array.isArray(before[key][sheet]))continue;
  const previous=new Map(before[key][sheet].map(r=>[Object.values(r)[0],r]));
  assert.equal(new Set(rows.map(r=>Object.values(r)[0])).size,rows.length);
  for(const old of previous.keys())assert.ok(rows.some(r=>Object.values(r)[0]===old),`Deleted ${sheet}/${old}`);
  for(const row of rows){const id=Object.values(row)[0],old=previous.get(id);if(!old){assert.deepEqual(row,currentSpec[section]?.[sheet]?.[id],`Unplanned addition ${sheet}/${id}`);added++;continue;}
   for(const[field,value]of Object.entries(row))if(JSON.stringify(value)!==JSON.stringify(old[field])){assert.deepEqual(value,currentSpec[section]?.[sheet]?.[id]?.[field],`Unplanned change ${sheet}/${id}/${field}`);changed++;}
  }
 }
}
let requests=0;
for(const region of d.tables['01_Region']){
 const rules=d.tables['07_ContextRule'].filter(r=>String(r.module_codes).split('|').includes(region.module)&&r.public_label&&r.public_group!=='INTERNAL'&&r.rule_type!=='PROFILE'&&r.rule_type!=='SAFETY'&&d.tables['11_ContextItemMap'].some(link=>link.rule_id===r.rule_id));
 for(const ids of [[],...rules.map(r=>[r.rule_id]),rules.map(r=>r.rule_id)]){
  const result=resolveAssessment(d,{region_id:region.region_id,context_rule_ids:ids});requests++;
  assert.equal(result.consultation_guide.length,new Set(result.consultation_guide.map(q=>q.guide_id)).size);
  const items=result.dimensions.flatMap(dim=>dim.groups.flatMap(g=>g.items));assert.equal(items.length,new Set(items.map(i=>i.item_id)).size);
  for(const item of items)for(const feature of item.possible_findings){assert.ok(!JSON.stringify(feature).includes('local-records://'));if(feature.has_treatment)assert.ok(feature.treatment_goals.every(g=>g.methods.length));}
 }
}
const report={batch,expected_fields_checked:checked,changed_fields:changed,added_records:added,unplanned_changes:0,workbook_runtime_issues:0,requests_checked:requests};
await fs.writeFile(`knowledge/review/static_remediation_batch${batch}_verification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
