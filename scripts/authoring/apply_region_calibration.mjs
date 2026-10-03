import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export async function applyRegionCalibration(main,extension,batch){
 const spec=JSON.parse(await fs.readFile('knowledge/review/region_calibration_v1.json','utf8'));
 const common=await fs.readFile('knowledge/review/common_region_v1.json','utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {batches:[]};});
 spec.batches.push(...common.batches);
 spec.batches.sort((a,b)=>a.batch-b.batch);
 const changes=[];
 for(const b of spec.batches.filter(b=>!batch||b.batch===batch))for(const [book,section]of [[main,'main'],[extension,'extension']]){
  for(const [name,records]of Object.entries(b[section])){
   const sheet=book.worksheets.getItem(name),values=sheet.getUsedRange().values,headers=values[0];
   for(const [id,patch]of Object.entries(records)){
    let row=values.findIndex((r,i)=>i>0&&r[0]===id);
    if(row<0){
     if(patch[headers[0]]!==id)throw Error(`Incomplete new record ${name}/${id}`);
     row=values.length;
     if(sheet.tables.items.length===1)sheet.tables.items[0].rows.add(null,[headers.map(h=>patch[h]??null)]);
     sheet.getRangeByIndexes(row,0,1,headers.length).copyFrom(sheet.getRangeByIndexes(row-1,0,1,headers.length),'all');
     sheet.getRangeByIndexes(row,0,1,headers.length).values=[headers.map(h=>patch[h]??null)];
     sheet.getRangeByIndexes(row,0,1,headers.length).format.rowHeight=210;
     values.push(headers.map(h=>patch[h]??null));changes.push({batch:b.batch,section,name,id,field:'$record',before:null,after:patch});
     continue;
    }
    for(const [field,after]of Object.entries(patch)){
     const col=headers.indexOf(field);if(col<0)throw Error(`${name}/${field}`);
     const before=values[row][col]??null;if(before===after)continue;
     sheet.getRangeByIndexes(row,col,1,1).values=[[after]];values[row][col]=after;
     changes.push({batch:b.batch,section,name,id,field,before,after});
    }
   }
  }
 }
 return changes;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const require=createRequire(new URL('../../build/authoring/region-calibration-runner.cjs',import.meta.url));
 const {FileBlob,SpreadsheetFile}=require('@oai/artifact-tool');
 const paths=['knowledge/RehabMind_KnowledgeDB_v3.8.xlsx','knowledge/RehabMind_ClinicalExtension_v1.1.xlsx'];
 const main=await SpreadsheetFile.importXlsx(await FileBlob.load(paths[0]));
 const extension=await SpreadsheetFile.importXlsx(await FileBlob.load(paths[1]));
 const batch=Number(process.argv.find(a=>a.startsWith('--batch='))?.split('=')[1]||1);
 const preview=process.argv.includes('--inspect')?'before':'after';
 const book=extension,sheet='LocationGuide',row=book.worksheets.getItem(sheet).getUsedRange().values.findIndex(r=>r[0]===({1:'LOC-THIGH-R-001',2:'LOC-LL-ANTERIOR',3:'LOC-AF-R-008'}[batch]))+1;
 if(preview==='after'){
  const backup='build/authoring/backups/region-calibration-20261002';await fs.mkdir(backup,{recursive:true});
  for(const p of [...paths,'build/knowledge/runtime.json'])try{await fs.copyFile(p,`${backup}/${p.split('/').at(-1)}`,(await import('node:fs')).constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
  const changes=await applyRegionCalibration(main,extension,batch);
  const spec=JSON.parse(await fs.readFile('knowledge/review/region_calibration_v1.json','utf8')).batches.find(b=>b.batch===batch);
  // Verify only allowed cells changed; imported formulas and unrelated sheets are preserved.
  for(const [w,section]of [[main,'main'],[extension,'extension']])for(const [name,records]of Object.entries(spec[section])){
   const values=w.worksheets.getItem(name).getUsedRange().values,headers=values[0];
   for(const [id,patch]of Object.entries(records)){const r=values.find(r=>r[0]===id);if(!r)throw Error(id);for(const [k,v]of Object.entries(patch))if(JSON.stringify(r[headers.indexOf(k)]??null)!==JSON.stringify(v))throw Error(`${id}/${k} not applied`);}
  }
  console.log((await extension.inspect({kind:'table',range:`LocationGuide!B${row}:E${row}`,include:'values',tableMaxRows:1,tableMaxCols:4,maxChars:650})).ndjson);
  console.log((await main.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:10},maxChars:500})).ndjson);
  console.log((await extension.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:10},maxChars:500})).ndjson);
  const log=`knowledge/review/region_calibration_batch${batch}_changes.json`;
  const previous=await fs.readFile(log,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {changes:[]};});
  await fs.writeFile(log,JSON.stringify({changes:[...previous.changes,...changes]},null,2)+'\n');
  for(const [w,p]of [[main,paths[0]],[extension,paths[1]]])await(await SpreadsheetFile.exportXlsx(w)).save(p);
  console.log(JSON.stringify({batch,changed_cells:changes.length}));
 }
 await fs.writeFile(`build/authoring/region-calibration-batch${batch}-${preview}.png`,new Uint8Array(await(await book.render({sheetName:sheet,range:`B${row}:E${row}`,scale:1})).arrayBuffer()));
}
