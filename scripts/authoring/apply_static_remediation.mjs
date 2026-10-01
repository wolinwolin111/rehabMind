import fs from 'node:fs/promises';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const batch=Number(process.argv.find(x=>x.startsWith('--batch='))?.split('=')[1]||1);
const custom=process.argv.find(x=>x.startsWith('--spec='))?.slice(7);
const spec=JSON.parse(await fs.readFile(custom||`knowledge/review/static_remediation_batch${batch}_v1.json`,'utf8'));
const paths={...(Object.keys(spec.main).length?{main:'knowledge/RehabMind_KnowledgeDB_v3.8.xlsx'}:{}),extension:'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx'};
const books=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([key,path])=>[key,await SpreadsheetFile.importXlsx(await FileBlob.load(path))])));
const tag=custom?'toe-locations':`static-batch${batch}`;
const preview=custom?['LocationGuide',process.argv.includes('--inspect')?'LOC-AF-R-012':'LOC-TOE-HALLUX','B','E']:{1:['FindingFeature','AFM-0086-LIMIT','C','E'],2:['ClinicalPurpose','THIGH-SPT-NEURO','B','D'],3:['InterventionReference','AFM-0050-TENSION-ACTIVE','C','D'],4:['ClinicalPurpose','LL-PATTERN-GAIT','B','D']}[batch];
if(process.argv.includes('--inspect')){
 const [sheet,id,start,end]=custom?preview:batch===2?['ClinicalPurpose','CORE-SPT-NEURO-DISTAL','B','D']:batch===4?['ClinicalPurpose','KNEE-PATTERN-GAIT','B','D']:preview;
 const row=books.extension.worksheets.getItem(sheet).getUsedRange().values.findIndex(r=>r[0]===id)+1;
 await fs.writeFile(`build/authoring/${tag}-before.png`,new Uint8Array(await(await books.extension.render({sheetName:sheet,range:`${start}${row}:${end}${row}`,scale:1})).arrayBuffer()));
 console.log('Read-only preview saved.');
}else{
 const backup=`build/authoring/backups/${tag}-20261001`;
 await fs.mkdir(backup,{recursive:true});
 for(const file of [...Object.values(paths),'build/knowledge/runtime.json']){
  try{await fs.copyFile(file,`${backup}/${file.split('/').at(-1)}`,(await import('node:fs')).constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
 }
 const changes=[];
 if(custom){
  const sheet=books.extension.worksheets.getItem('LocationGuide'),headers=sheet.getUsedRange().values[0];
  if(!headers.includes('Auto_Apply_To_Region')){
   const cell=sheet.getRangeByIndexes(0,headers.length,1,1);
   cell.copyFrom(sheet.getRangeByIndexes(0,headers.length-1,1,1),'all');cell.values=[['Auto_Apply_To_Region']];
   changes.push({section:'extension',sheet:'LocationGuide',id:'$schema',field:'Auto_Apply_To_Region',before:null,after:'Optional Boolean; blank preserves existing region routing'});
  }
 }
 for(const section of ['main','extension'])for(const[sheetName,records]of Object.entries(spec[section])){
  const sheet=books[section].worksheets.getItem(sheetName),values=sheet.getUsedRange().values,headers=values[0];
  for(const[id,fields]of Object.entries(records)){
   let row=values.findIndex((r,i)=>i>0&&r[0]===id);
   if(row<1){
    if(fields[headers[0]]!==id||headers.some(h=>h!=='Auto_Apply_To_Region'&&!(h in fields)))throw Error(`Incomplete record ${sheetName}/${id}`);
    row=values.length;
    const target=sheet.getRangeByIndexes(row,0,1,headers.length);
    target.copyFrom(sheet.getRangeByIndexes(row-1,0,1,headers.length),'all');
    target.values=[headers.map(h=>fields[h]??null)];
    target.format.wrapText=true;
    target.format.verticalAlignment='top';
    target.format.rowHeight=110;
    values.push(headers.map(h=>fields[h]??null));
    changes.push({section,sheet:sheetName,id,field:'$record',before:null,after:fields});
   }else for(const[field,after]of Object.entries(fields)){
    const column=headers.indexOf(field);if(column<0)throw Error(`Missing field ${sheetName}/${field}`);
    const before=values[row][column]??null;if(before===after)continue;
    sheet.getRangeByIndexes(row,column,1,1).values=[[after]];
    changes.push({section,sheet:sheetName,id,field,before,after});values[row][column]=after;
   }
   if(fields[headers[0]]===id){const target=sheet.getRangeByIndexes(row,0,1,headers.length);target.format.wrapText=true;target.format.verticalAlignment='top';target.format.rowHeight=110;}
  }
 }
 for(const book of Object.values(books))book.recalculate();
 const[sheet,id,start,end]=preview;
 const row=books.extension.worksheets.getItem(sheet).getUsedRange().values.findIndex(r=>r[0]===id)+1;
 console.log((await books.extension.inspect({kind:'table',range:`${sheet}!${start}${row}:${end}${row}`,include:'values',tableMaxRows:1,tableMaxCols:3,maxChars:1000})).ndjson);
 console.log((await books.extension.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:50},maxChars:1000})).ndjson);
 const endRow=custom?row+1:row;
 await fs.writeFile(`build/authoring/${tag}-after.png`,new Uint8Array(await(await books.extension.render({sheetName:sheet,range:`${start}${row}:${end}${endRow}`,scale:1})).arrayBuffer()));
 for(const section of Object.keys(paths))await(await SpreadsheetFile.exportXlsx(books[section])).save(paths[section]);
 const logPath=custom?'knowledge/review/toe_locations_changes.json':`knowledge/review/static_remediation_batch${batch}_changes.json`;
 const previous=await fs.readFile(logPath,'utf8').then(JSON.parse).catch(error=>{if(error.code!=='ENOENT')throw error;return{changes:[]};});
 await fs.writeFile(logPath,JSON.stringify({date:'2026-10-01',changes:[...previous.changes,...changes]},null,2)+'\n');
 console.log(JSON.stringify({batch,changed_fields:changes.filter(c=>c.field!=='$record').length,added_records:changes.filter(c=>c.field==='$record').length,backup}));
}
