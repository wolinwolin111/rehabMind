import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
import {applyLowerLegBatch,upsert} from './apply_knee_calf_pilot.mjs';
const specPath='knowledge/review/lower_limb_completion_v1.json';
const mainPath='knowledge/RehabMind_KnowledgeDB_v3.8.xlsx',extensionPath='knowledge/RehabMind_ClinicalExtension_v1.1.xlsx';
export async function applyLowerLimbCompletion(main,extension){
 const spec=JSON.parse(await fs.readFile(specPath,'utf8'));
 const counts=await applyLowerLegBatch(extension,specPath);
 for(const [sheet,updates]of Object.entries(spec.main_updates))upsert(main.worksheets.getItem(sheet),updates);
 const {applyDisplayClarity}=await import('./apply_display_clarity.mjs');
 await applyDisplayClarity(main,extension);
 const {applyClinicalRemediation}=await import('./apply_clinical_remediation.mjs');
 await applyClinicalRemediation(main,extension);
 // Display labels are policy only; all clinical note text is read from the workbook.
 await fs.writeFile('api/completion-note-policy.mjs','// Generated display policy; clinical text remains in FindingFeature.\nexport const completionNotes = '+JSON.stringify(Object.entries(spec.display_notes),null,2)+';\n');
 return {...counts,main_records:Object.values(spec.main_updates).reduce((n,r)=>n+r.length,0)};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const main=await SpreadsheetFile.importXlsx(await FileBlob.load(mainPath));
 const extension=await SpreadsheetFile.importXlsx(await FileBlob.load(extensionPath));
 const featureId=process.argv.find(value=>value.startsWith('--feature='))?.slice('--feature='.length);
 if(featureId){
  const spec=JSON.parse(await fs.readFile(specPath,'utf8'));
  const record=spec.features.find(row=>row.Feature_ID===featureId);
  if(!record)throw Error(featureId);
  const sheet=extension.worksheets.getItem('FindingFeature'),values=sheet.getUsedRange().values;
  const row=values.findIndex(value=>value[0]===featureId);
  if(row<1)throw Error(featureId);
  if(!process.argv.includes('--inspect')){
   const backup='build/authoring/backups/lower-limb-final-20261001';await fs.mkdir(backup,{recursive:true});
   try{await fs.copyFile(extensionPath,`${backup}/${extensionPath.split('/').at(-1)}`,(await import('node:fs')).constants.COPYFILE_EXCL);}catch(error){if(error.code!=='EEXIST')throw error;}
   sheet.getRangeByIndexes(row,values[0].indexOf('Finding_Interpretation'),1,1).values=[[record.Finding_Interpretation]];
   extension.recalculate();
   await fs.writeFile('api/completion-note-policy.mjs','// Generated display policy; clinical text remains in FindingFeature.\nexport const completionNotes = '+JSON.stringify(Object.entries(spec.display_notes),null,2)+';\n');
  }
  const preview=await extension.render({sheetName:'FindingFeature',range:`C${row+1}:E${row+1}`,scale:1});
  await fs.writeFile(`build/authoring/final-note-${process.argv.includes('--inspect')?'before':'after'}.png`,new Uint8Array(await preview.arrayBuffer()));
  if(!process.argv.includes('--inspect')){
   console.log((await extension.inspect({kind:'table',range:`FindingFeature!C${row+1}:E${row+1}`,include:'values',tableMaxRows:1,tableMaxCols:3,maxChars:700})).ndjson);
   await(await SpreadsheetFile.exportXlsx(extension)).save(extensionPath);
  }
 }else if(process.argv.includes('--inspect')){
  const image=await extension.render({sheetName:'InterventionReference',range:'C55:D56',scale:1});
  await fs.writeFile('build/authoring/completion-before.png',new Uint8Array(await image.arrayBuffer()));
  console.log('Existing workbook view saved; no edits.');
 }else{
  const backup='build/authoring/backups/lower-limb-completion-20261001';await fs.mkdir(backup,{recursive:true});
  for(const path of [mainPath,extensionPath]){
   try {await fs.copyFile(path,`${backup}/${path.split('/').at(-1)}`,(await import('node:fs')).constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}
  }
  console.log(JSON.stringify(await applyLowerLimbCompletion(main,extension)));
  main.recalculate();extension.recalculate();
  for(const [book,sheetName,id,cols,filename]of [
   [extension,'FindingFeature','AFM-0031-PAD',['C','E'],'completion-findings'],
   [extension,'InterventionReference','AFM-0031-PAD-CUSHION',['C','D'],'completion-methods'],
   [extension,'ConsultationGuide','QG-AF-R-011-1',['B','G'],'completion-questions'],
   [extension,'ClinicalPurpose','AF-LT-011',['B','D'],'completion-purpose'],
   [extension,'LocationGuide','LOC-AF-R-011',['B','E'],'completion-location'],
   [main,'07_ContextRule','KNEE-SAF-01',['K','M'],'completion-risk'],
  ]){
   const row=book.worksheets.getItem(sheetName).getUsedRange().values.findIndex(r=>r[0]===id)+1;
   if(!row)throw Error(id);
   const image=await book.render({sheetName,range:`${cols[0]}${row}:${cols[1]}${row}`,scale:1});
   await fs.writeFile(`build/authoring/${filename}.png`,new Uint8Array(await image.arrayBuffer()));
  }
  console.log((await extension.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?',options:{useRegex:true,maxResults:10},maxChars:800})).ndjson);
  await (await SpreadsheetFile.exportXlsx(extension)).save(extensionPath);
  await (await SpreadsheetFile.exportXlsx(main)).save(mainPath);
 }
}
