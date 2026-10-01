import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolveAssessment} from '../../api/resolver.mjs';
const batch=Number(process.argv.find(x=>x.startsWith('--batch='))?.split('=')[1]||1);
const d=JSON.parse(await fs.readFile('build/knowledge/runtime.json','utf8'));
if(process.argv.includes('--rebuild')){
 const {FileBlob,SpreadsheetFile}=await import('@oai/artifact-tool');
 const main=await SpreadsheetFile.importXlsx(await FileBlob.load('knowledge/RehabMind_KnowledgeDB_v3.8.xlsx'));
 const extension=await SpreadsheetFile.importXlsx(await FileBlob.load('knowledge/RehabMind_ClinicalExtension_v1.1.xlsx'));
 const tables={main:Object.keys(d.tables),extension:Object.keys(d.clinical_extension).filter(k=>Array.isArray(d.clinical_extension[k]))};
 const snapshot=()=>Object.fromEntries([[main,'main'],[extension,'extension']].map(([book,section])=>[section,Object.fromEntries(tables[section].map(name=>[name,book.worksheets.getItem(name).getUsedRange().values.filter((r,i)=>i===0||r[0])]))]));
 const old=snapshot();
 const {applyLowerLimbCompletion}=await import('./apply_lower_limb_completion.mjs');
 await applyLowerLimbCompletion(main,extension);
 const current=snapshot();
 const differences=[];
 for(const section of Object.keys(tables))for(const name of tables[section])if(JSON.stringify(old[section][name])!==JSON.stringify(current[section][name]))differences.push(`${section}/${name}`);
 if(differences.length){await fs.writeFile('build/authoring/clinical-rebuild-diff.json',JSON.stringify({before:old,after:current},null,2));throw Error(`Rebuild changes canonical content: ${differences.join(', ')}`);}
 console.log('Completion pipeline preserves current canonical content; no workbook exported.');
 if(process.argv.includes('--rebuild-only'))process.exit(0);
}
const before=JSON.parse(await fs.readFile(`build/authoring/backups/clinical-batch${batch}-20261001/runtime.json`,'utf8'));
const specs=[];
for(let n=1;n<=batch;n++)specs.push(JSON.parse(await fs.readFile(`knowledge/review/clinical_remediation_batch${n}_v1.json`,'utf8')));
const effective={main:{},extension:{}};
for(const s of specs)for(const section of ['main','extension'])for(const [sheet,rows]of Object.entries(s[section]))for(const [id,patch]of Object.entries(rows))Object.assign((effective[section][sheet]??={})[id]??={},patch);
let fieldCount=0,changes=0,added=0;
for(const section of ['main','extension']){
 const tables=d[section==='main'?'tables':'clinical_extension'];
 for(const [sheet,rows]of Object.entries(effective[section]))for(const [id,patch]of Object.entries(rows)){
  const target=tables[sheet].find(row=>Object.values(row)[0]===id);assert.ok(target,`${sheet}/${id}`);
  for(const [field,value]of Object.entries(patch)){assert.deepEqual(target[field],value,`${sheet}/${id}/${field}`);fieldCount++;}
 }
 for(const [sheet,rows]of Object.entries(tables)){
  if(!Array.isArray(rows)||!Array.isArray(before[section==='main'?'tables':'clinical_extension'][sheet]))continue;
  const old=before[section==='main'?'tables':'clinical_extension'][sheet];
  const oldById=new Map(old.map(row=>[Object.values(row)[0],row]));
  assert.equal(new Set(rows.map(row=>Object.values(row)[0])).size,rows.length,`Duplicate ${sheet}`);
  for(const previous of old)assert.ok(rows.some(row=>Object.values(row)[0]===Object.values(previous)[0]),`Deleted ${sheet}`);
  for(const row of rows){
   const id=Object.values(row)[0],previous=oldById.get(id);
   if(!previous){assert.deepEqual(effective[section][sheet]?.[id],row,`Unplanned addition ${sheet}/${id}`);added++;continue;}
   for(const key of new Set([...Object.keys(row),...Object.keys(previous)])){
   if(JSON.stringify(row[key])===JSON.stringify(previous[key]))continue;
   assert.deepEqual(effective[section][sheet]?.[id]?.[key],row[key],`Unplanned change ${sheet}/${id}/${key}`);changes++;
   }
  }
 }
}
for(const region of d.tables['01_Region']){
 const result=resolveAssessment(d,{region_id:region.region_id});
 assert.equal(new Set(result.consultation_guide.map(q=>q.guide_id)).size,result.consultation_guide.length);
 for(const dim of result.dimensions)for(const group of dim.groups)for(const item of group.items){
  assert.equal(new Set(item.possible_findings.map(f=>f.feature_id)).size,item.possible_findings.length);
  for(const finding of item.possible_findings)assert.ok(!JSON.stringify(finding).includes('local-records://'),'Internal source must stay internal');
 }
}
const report={batch,expected_fields_checked:fieldCount,changed_cells:changes,added_records:added,unplanned_changes:0,unapplied_fields:0,regions_checked:d.tables['01_Region'].length};
await fs.writeFile(`knowledge/review/clinical_remediation_batch${batch}_verification.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
