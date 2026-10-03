import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {applyRegionCalibration} from './apply_region_calibration.mjs';

const require=createRequire(new URL('../../build/authoring/common-regions-runner.cjs',import.meta.url));
const {FileBlob,SpreadsheetFile}=require('@oai/artifact-tool');
const batch=Number(process.argv.find(a=>a.startsWith('--batch='))?.split('=')[1]||4);
const paths=['knowledge/RehabMind_KnowledgeDB_v3.8.xlsx','knowledge/RehabMind_ClinicalExtension_v1.1.xlsx'];
const main=await SpreadsheetFile.importXlsx(await FileBlob.load(paths[0]));
const extension=await SpreadsheetFile.importXlsx(await FileBlob.load(paths[1]));
const spec=JSON.parse(await fs.readFile('knowledge/review/common_region_v1.json','utf8')).batches.find(b=>b.batch===batch);
if(!spec)throw Error(`Unknown batch ${batch}`);
const inspect=process.argv.includes('--inspect');
const stage=inspect?'before':'after';
if(!inspect){
  const backup=`build/authoring/backups/common-regions-batch${batch}-20261002`;
  await fs.mkdir(backup,{recursive:true});
  for(const path of [...paths,'build/knowledge/runtime.json'])try{await fs.copyFile(path,`${backup}/${path.split('/').at(-1)}`,(await import('node:fs')).constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
  const changes=await applyRegionCalibration(main,extension,batch);
  for(const [book,section]of [[main,'main'],[extension,'extension']])for(const [name,records]of Object.entries(spec[section])){
    const values=book.worksheets.getItem(name).getUsedRange().values,headers=values[0];
    for(const[id,patch]of Object.entries(records))for(const[k,v]of Object.entries(patch))if(JSON.stringify(values.find(r=>r[0]===id)?.[headers.indexOf(k)]??null)!==JSON.stringify(v))throw Error(`${id}/${k} not applied`);
  }
  await fs.writeFile(`knowledge/review/common_region_batch${batch}_changes.json`,JSON.stringify({date:'2026-10-02',changes},null,2)+'\n');
  console.log(JSON.stringify({batch,changes:changes.length}));
}
console.log((await extension.inspect({kind:'table',range:'LocationGuide!A1:D3',include:'values',tableMaxRows:3,tableMaxCols:4,maxChars:600})).ndjson);
for(const book of [main,extension])console.log((await book.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:5},maxChars:350})).ndjson);
const values=extension.worksheets.getItem('LocationGuide').getUsedRange().values;
const sample=Object.keys(spec.extension.LocationGuide).find(id=>values.some(r=>r[0]===id));
const row=sample?values.findIndex(r=>r[0]===sample)+1:values.length;
await fs.writeFile(`build/authoring/common-regions-batch${batch}-${stage}.png`,new Uint8Array(await(await extension.render({sheetName:'LocationGuide',range:`B${row}:E${row}`,scale:1})).arrayBuffer()));
if(!inspect)for(const [book,path,section]of [[main,paths[0],'main'],[extension,paths[1],'extension']]){
  if(Object.keys(spec[section]).length)await(await SpreadsheetFile.exportXlsx(book)).save(path);
}
