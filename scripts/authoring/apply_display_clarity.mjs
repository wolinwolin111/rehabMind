import fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const paths=['knowledge/RehabMind_KnowledgeDB_v3.8.xlsx','knowledge/RehabMind_ClinicalExtension_v1.1.xlsx'];
const specification='knowledge/review/lower_limb_display_clarity_v1.json';
function patchColumns(sheet,records,fields,key){
 const values=sheet.getUsedRange().values,headers=values[0].filter(Boolean);
 for(const field of fields){
  if(headers.includes(field))continue;
  const index=headers.length;
  sheet.getRangeByIndexes(0,index,1,1).copyFrom(sheet.getRangeByIndexes(0,index-1,1,1),'all');
  sheet.getRangeByIndexes(0,index,1,1).values=[[field]];
  sheet.getRangeByIndexes(0,index,values.length,1).format.columnWidth=field.includes('source')?60:58;
  sheet.getRangeByIndexes(1,index,values.length-1,1).format={font:{name:'Microsoft YaHei',size:11,color:'#293B58'},wrapText:true,verticalAlignment:'top'};
  headers.push(field);
 }
 for(const record of records){
  const row=values.findIndex(value=>value[0]===record[key]);
  if(row<1)throw Error(`Unknown record ${record[key]}`);
  for(const field of fields)sheet.getRangeByIndexes(row,headers.indexOf(field),1,1).values=[[record[field]??null]];
  if(key==='region_id')sheet.getRangeByIndexes(row,0,1,headers.length).format.rowHeight=96;
 }
}
export async function applyDisplayClarity(main,extension){
 const spec=JSON.parse(await fs.readFile(specification,'utf8'));
 patchColumns(main.worksheets.getItem('01_Region'),spec.regions,['related_tissues','related_tissues_source'],'region_id');
 if(spec.navigation.length)patchColumns(extension.worksheets.getItem('FindingFeature'),spec.navigation,
  ['Related_Location_Region_IDs','Related_Location_Hide_Option_When_Current'],'Feature_ID');
 return {region_tissues:spec.regions.length,navigation_rules:spec.navigation.length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const main=await SpreadsheetFile.importXlsx(await FileBlob.load(paths[0]));
 const extension=await SpreadsheetFile.importXlsx(await FileBlob.load(paths[1]));
 if(process.argv.includes('--inspect')){
  for(const [book,sheetName,range,name]of [[main,'01_Region','A1:D3','tissues-before'],[extension,'FindingFeature','C192:E193','navigation-before']]){
   const preview=await book.render({sheetName,range,scale:1});
   await fs.writeFile(`build/authoring/${name}.png`,new Uint8Array(await preview.arrayBuffer()));
  }
 }else{
  const backup='build/authoring/backups/display-clarity-20261001';await fs.mkdir(backup,{recursive:true});
  for(const path of paths){try{await fs.copyFile(path,`${backup}/${path.split('/').at(-1)}`,(await import('node:fs')).constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}}
  console.log(JSON.stringify(await applyDisplayClarity(main,extension)));
  for(const [book,sheetName,range,name]of [[main,'01_Region','H1:I3','tissues-after'],[extension,'FindingFeature','J1:K3','navigation-after']]){
   const preview=await book.render({sheetName,range,scale:1});
   await fs.writeFile(`build/authoring/${name}.png`,new Uint8Array(await preview.arrayBuffer()));
   console.log((await book.inspect({kind:'match',searchTerm:'#REF!|#VALUE!|#DIV/0!',options:{useRegex:true,maxResults:5},maxChars:500})).ndjson);
  }
  for(const [index,book]of [main,extension].entries())await(await SpreadsheetFile.exportXlsx(book)).save(paths[index]);
 }
}
