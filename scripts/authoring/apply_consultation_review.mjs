import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export async function applyConsultationReview(book){
 const spec=JSON.parse(await fs.readFile('knowledge/review/consultation_review_v1.json','utf8'));
 const sheet=book.worksheets.getItem('ConsultationGuide'), values=sheet.getUsedRange().values, headers=values[0], changes=[];
 for(const [id,fields]of [...Object.entries(spec.updates),...spec.additions.map(r=>[r.Guide_ID,r])]){
  let row=values.findIndex((r,i)=>i>0&&r[0]===id);
  if(row<0){
   row=values.length;
   if(sheet.tables.items.length===1)sheet.tables.items[0].rows.add(null,[headers.map(h=>fields[h]??null)]);
   sheet.getRangeByIndexes(row,0,1,headers.length).copyFrom(sheet.getRangeByIndexes(row-1,0,1,headers.length),'all');
   sheet.getRangeByIndexes(row,0,1,headers.length).values=[headers.map(h=>fields[h]??null)];
   sheet.getRangeByIndexes(row,0,1,headers.length).format={wrapText:true,verticalAlignment:'top',rowHeight:170};
   values.push(headers.map(h=>fields[h]??null));
   changes.push({sheet:'ConsultationGuide',id,field:'$record',before:null,after:fields});
  }else for(const [field,after]of Object.entries(fields)){
   const col=headers.indexOf(field);if(col<0)throw Error(field);
   const before=values[row][col]??null;if(before===after)continue;
   sheet.getRangeByIndexes(row,col,1,1).values=[[after]];values[row][col]=after;
   changes.push({sheet:'ConsultationGuide',id,field,before,after});
  }
 }
 for(const record of spec.additions){
  const row=values.findIndex(r=>r[0]===record.Guide_ID);
  sheet.getRangeByIndexes(row,0,1,headers.length).format={wrapText:true,verticalAlignment:'top',rowHeight:170};
 }
 return changes;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const require=createRequire(new URL('../../build/authoring/consultation-runner.cjs',import.meta.url));
 const {FileBlob,SpreadsheetFile}=require('@oai/artifact-tool');
 const path='knowledge/RehabMind_ClinicalExtension_v1.1.xlsx';
 const book=await SpreadsheetFile.importXlsx(await FileBlob.load(path));
 const inspect=process.argv.includes('--inspect');
 if(!inspect){
  try { await fs.copyFile(path,'build/authoring/consultation-before.xlsx',(await import('node:fs')).constants.COPYFILE_EXCL); } catch(error) { if(error.code!=='EEXIST')throw error; }
  const changes=await applyConsultationReview(book);book.recalculate();
  console.log((await book.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:5},maxChars:500})).ndjson);
  await(await SpreadsheetFile.exportXlsx(book)).save(path);
  const log='knowledge/review/consultation_review_changes.json';
  const previous=await fs.readFile(log,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {changes:[]};});
  await fs.writeFile(log,JSON.stringify({changes:[...previous.changes,...changes]},null,2)+'\n');
  console.log({changed_cells:changes.length});
 }
 const values=book.worksheets.getItem('ConsultationGuide').getUsedRange().values;
 const row=inspect?2:values.findIndex(r=>r[0]==='QG-PAIN-QUALITY')+1;
 await fs.writeFile(`build/authoring/consultation-review-${inspect?'before':'after'}.png`,new Uint8Array(await(await book.render({sheetName:'ConsultationGuide',range:`B${row}:G${row}`,scale:1})).arrayBuffer()));
}
