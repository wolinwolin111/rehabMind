import fs from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const path = 'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx';
const specPath = 'knowledge/review/knee_calf_pilot_v1.json';
function rows(sheet) {
  const [headers, ...values] = sheet.getUsedRange().values;
  return { headers: headers.filter(Boolean), rows: values.filter(row => row[0]).map(row =>
    Object.fromEntries(headers.filter(Boolean).map((field, i) => [field, row[i] ?? null]))) };
}
function write(sheet, headers, values, style = false) {
  const old = sheet.getUsedRange();
  if (old) old.clear({ applyTo: 'contents' });
  const range = sheet.getRangeByIndexes(0, 0, values.length + 1, headers.length);
  range.values = [headers, ...values.map(row => headers.map(field => row[field] ?? null))];
  if (!style) return;
  range.format.font = { name: 'Microsoft YaHei', size: 11, color: '#293B58' };
  range.format.wrapText = true; range.format.verticalAlignment = 'top';
  range.format.columnWidth = 48;
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format = {
    fill: '#DDEBE7', font: { bold: true, color: '#29434A' }, rowHeight: 32,
  };
  sheet.showGridLines = false; sheet.freezePanes.freezeRows(1);
}
export function upsert(sheet, additions, extraHeaders = []) {
  const current = rows(sheet);
  const headers = [...new Set([...current.headers, ...extraHeaders])];
  const mapped = new Map(current.rows.map(row => [row[headers[0]], row]));
  additions.forEach(row => mapped.set(row[headers[0]], {...mapped.get(row[headers[0]]),...row}));
  if (headers.length === current.headers.length) {
    const physical=sheet.getUsedRange().values;
    const indexes=new Map(physical.map((row,index)=>[row[0],index]).filter(([key])=>key));
    const blanks=physical.flatMap((row,index)=>index && !row[0] ? [index] : []);
    let nextIndex=physical.length;
    for (const row of additions) {
      const id=row[headers[0]];
      const existing=indexes.get(id);
      const index=existing ?? blanks.shift() ?? nextIndex++;
      indexes.set(id,index);
      sheet.getRangeByIndexes(index, 0, 1, headers.length).values = [headers.map(field => mapped.get(row[headers[0]])[field] ?? null)];
      if(existing===undefined) sheet.getRangeByIndexes(index,0,1,headers.length).format={
        font:{name:'Microsoft YaHei',size:11,color:'#293B58'},wrapText:true,verticalAlignment:'top',rowHeight:80,
      };
    }
  } else write(sheet, headers, [...mapped.values()]);
  for (const row of headers.length===current.headers.length ? [] : additions) {
    const index = [...mapped.keys()].indexOf(row[headers[0]]) + 1;
    if (index > current.rows.length) sheet.getRangeByIndexes(index, 0, 1, headers.length).format = {
      font: {name:'Microsoft YaHei',size:11,color:'#293B58'}, wrapText:true, verticalAlignment:'top',rowHeight:80,
    };
  }
}

export async function applyKneeCalfPilot(book) {
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  const sheetNames = (await book.inspect({ kind: 'sheet', include: 'name', maxChars: 5000 })).ndjson;
  const location = sheetNames.includes('LocationGuide') ? book.worksheets.getItem('LocationGuide') : book.worksheets.add('LocationGuide');
  if (sheetNames.includes('LocationGuide')) upsert(location, [spec.location], Object.keys(spec.location));
  else write(location, Object.keys(spec.location), [spec.location], true);
  location.getRange('A2:K2').format.rowHeight = 230;
  location.getRange('E1:E2').format.columnWidth = 66;
  const questions = spec.guides.map(row => ({ ...row, Scope: 'LOCATION', Region_IDs: null,
    Area_IDs: spec.location.Area_ID, Module_Codes: spec.location.Module_Codes,
    Input_Mode: 'Display_Only', Review_Status: '待临床审核',
    Source_Reference: spec.source_note, Internal_Note: '部位问诊编辑样例；仅展示，不解析回答。' }));
  upsert(book.worksheets.getItem('ConsultationGuide'), questions, ['Area_IDs', 'Replaces_Guide_ID']);
  const guide = book.worksheets.getItem('ConsultationGuide');
  guide.getRange('A8:Q11').format = {font: {name:'Microsoft YaHei', size:11, color:'#293B58'}, wrapText:true, verticalAlignment:'top', rowHeight:112};
  guide.getRange('P1:Q11').format.columnWidth = 32;
  upsert(book.worksheets.getItem('ClinicalPurpose'), [spec.purpose]);
  upsert(book.worksheets.getItem('FindingFeature'), spec.features.map(row => ({ ...row,
    Source_URL: spec.purpose.Source_URL, Review_Status: '待临床审核' })));
  const features = book.worksheets.getItem('FindingFeature'), featureRows = rows(features);
  for (const row of spec.features) {
    const index = featureRows.rows.findIndex(value => value.Feature_ID === row.Feature_ID) + 1;
    features.getRangeByIndexes(index, 0, 1, featureRows.headers.length).format = {
      font:{name:'Microsoft YaHei',size:11,color:'#293B58'},wrapText:true,verticalAlignment:'top',rowHeight:80,
    };
  }
  const refs = book.worksheets.getItem('InterventionReference'), current = rows(refs);
  write(refs, current.headers, current.rows.filter(row => !spec.retired_references.includes(row.Reference_ID)));
  return { location: spec.location.Area_ID, regional_questions: questions.length,
    added_features: spec.features.length, retired_references: spec.retired_references };
}

export async function applyLowerLegMedial(book) {
  const spec = JSON.parse(await fs.readFile('knowledge/review/lower_leg_medial_v1.json', 'utf8'));
  const runtime = JSON.parse(await fs.readFile('build/knowledge/runtime.json', 'utf8'));
  const itemById = new Map(runtime.tables['02_ClinicalItem'].map(row => [row.item_id, row]));
  upsert(book.worksheets.getItem('LocationGuide'), spec.locations);
  book.worksheets.getItem('LocationGuide').getRange('F3:G4').format = {
    font:{name:'Microsoft YaHei',size:11,color:'#293B58'}, wrapText:true,
    verticalAlignment:'top',columnWidth:90,rowHeight:145,
  };
  upsert(book.worksheets.getItem('ConsultationGuide'), spec.guides.map(row => ({ ...row,
    Scope:'LOCATION',Region_IDs:null,Module_Codes:'LOWER_LEG',Input_Mode:'Display_Only',
    Review_Status:'待临床审核',Source_Reference:spec.source_note,Internal_Note:'问诊展示稿，无答案录入或自动选择。'
  })));
  upsert(book.worksheets.getItem('ClinicalPurpose'), spec.purposes.map(row => ({ ...row,
    Item_Name:itemById.get(row.Item_ID).display_name,Module:'LOWER_LEG',
    Source_URL:`baseline://database-v3.8/02_ClinicalItem/${row.Item_ID}`,Review_Status:'待临床审核'
  })));
  upsert(book.worksheets.getItem('FindingFeature'), spec.features.map(row => ({ ...row,
    Source_URL:row.Source_URL || `baseline://database-v3.8/08_AssessmentFindingMap/${row.Assessment_Map_ID}`,
    Review_Status:'待临床审核'
  })));
  upsert(book.worksheets.getItem('InterventionReference'), spec.references.map(row => ({ ...row,
    Progression:null,Review_Status:'待临床审核'
  })));
  return { locations:spec.locations.length,questions:spec.guides.length,purposes:spec.purposes.length,
    features:spec.features.length,references:spec.references.length };
}

function removeRecords(sheet, ids) {
  for(const id of ids || []) {
    const values=sheet.getUsedRange().values;
    const index=values.findIndex(row=>row[0]===id);
    // Reuse retired slots on upsert; leave unrelated row values and styles in place.
    if(index>0) sheet.getRangeByIndexes(index,0,1,values[0].length).clear({applyTo:'contents'});
  }
}

export async function applyLowerLegBatch(book,specPath) {
  const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
  const runtime = JSON.parse(await fs.readFile('build/knowledge/runtime.json', 'utf8'));
  const itemById = new Map(runtime.tables['02_ClinicalItem'].map(row => [row.item_id, row]));
  removeRecords(book.worksheets.getItem('InterventionReference'),spec.retired_references);
  removeRecords(book.worksheets.getItem('FindingFeature'),spec.retired_features);
  upsert(book.worksheets.getItem('LocationGuide'), spec.locations);
  upsert(book.worksheets.getItem('ConsultationGuide'), spec.guides.map(row => ({ ...row,
    Scope:row.Scope || 'LOCATION',Region_IDs:row.Region_IDs || null,Module_Codes:row.Module_Codes || spec.module || 'LOWER_LEG',Input_Mode:'Display_Only',
    Review_Status:'待临床审核',Source_Reference:row.Source_Reference || spec.source_note,Internal_Note:row.Internal_Note || '仅展示问诊思路，不解析回答或自动安排评估。'
  })));
  upsert(book.worksheets.getItem('ClinicalPurpose'), spec.purposes.map(row => ({ ...row,
    Item_Name:row.Item_Name || itemById.get(row.Item_ID)?.display_name,Module:row.Module || spec.module || 'LOWER_LEG',
    Source_URL:row.Source_URL || `baseline://database-v3.8/02_ClinicalItem/${row.Item_ID}${spec.anatomy_source ? '\n'+spec.anatomy_source : ''}`,
    Review_Status:'待临床审核'
  })));
  upsert(book.worksheets.getItem('FindingFeature'), spec.features.map(row => ({ ...row,
    Source_URL:row.Source_URL || `baseline://database-v3.8/08_AssessmentFindingMap/${row.Assessment_Map_ID}${spec.anatomy_source ? '\n'+spec.anatomy_source : ''}`,
    Review_Status:'待临床审核'
  })));
  upsert(book.worksheets.getItem('InterventionReference'), spec.references.map(row => ({ ...row,
    Progression:null,Review_Status:'待临床审核'
  })));
  // Extend the existing authoring style only to this batch's changed records.
  for (const [name, additions, height] of [
    ['LocationGuide',spec.locations,210],['ConsultationGuide',spec.guides,112],
    ['ClinicalPurpose',spec.purposes,88],['FindingFeature',spec.features,92],
    ['InterventionReference',spec.references,115],
  ]) {
    const sheet=book.worksheets.getItem(name), current=rows(sheet);
    for(const row of additions) {
      const index=sheet.getUsedRange().values.findIndex(value=>value[0]===row[current.headers[0]]);
      sheet.getRangeByIndexes(index,0,1,current.headers.length).format.rowHeight=height;
    }
  }
  return {locations:spec.locations.length,questions:spec.guides.length,purposes:spec.purposes.length,
    features:spec.features.length,references:spec.references.length};
}

export const applyLowerLegAnterior=book=>applyLowerLegBatch(book,'knowledge/review/lower_leg_anterior_v1.json');
export const applyLowerLegLateral=book=>applyLowerLegBatch(book,'knowledge/review/lower_leg_lateral_v1.json');
export const applyLowerLegPosterior=book=>applyLowerLegBatch(book,'knowledge/review/lower_leg_posterior_v1.json');
export const applyTreatmentGapRepair=book=>applyLowerLegBatch(book,'knowledge/review/treatment_gap_repair_v1.json');
export const applyAnkleFrontAchilles=book=>applyLowerLegBatch(book,'knowledge/review/ankle_front_achilles_v1.json');
export const applyAnkleMedialLateral=book=>applyLowerLegBatch(book,'knowledge/review/ankle_medial_lateral_v1.json');
export const applyAnkleSharedReview=book=>applyLowerLegBatch(book,'knowledge/review/ankle_shared_review_v1.json');

export async function applyLocationReviewHints(book) {
  const spec=JSON.parse(await fs.readFile('knowledge/review/location_review_hints_v1.json','utf8'));
  const sheet=book.worksheets.getItem('FindingFeature'),current=rows(sheet);
  const fields=['Related_Location_Prompt','Related_Location_Action_Label'];
  const headers=[...current.headers];
  for(const field of fields) {
    if(headers.includes(field)) continue;
    const column=headers.length;
    headers.push(field);
    sheet.getRangeByIndexes(0,column,1,1).copyFrom(sheet.getRangeByIndexes(0,current.headers.length-1,1,1),'all');
    sheet.getRangeByIndexes(0,column,1,1).values=[[field]];
    sheet.getRangeByIndexes(0,column,current.rows.length+1,1).format.columnWidth=field==='Related_Location_Prompt'?60:32;
  }
  for(const hint of spec.hints) {
    const index=current.rows.findIndex(row=>row.Feature_ID===hint.Feature_ID)+1;
    if(!index) throw new Error(`Unknown location hint feature: ${hint.Feature_ID}`);
    for(const field of fields) {
      const cell=sheet.getRangeByIndexes(index,headers.indexOf(field),1,1);
      cell.values=[[hint[field]]];
      cell.format={font:{name:'Microsoft YaHei',size:11,color:'#293B58'},wrapText:true,verticalAlignment:'top'};
    }
  }
  return {hints:spec.hints.length,added_columns:headers.length-current.headers.length};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const book = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
  if (process.argv.includes('--inspect-ankle-shared-review')) {
    const sheet=book.worksheets.getItem('InterventionReference');
    const start=sheet.getUsedRange().values.findIndex(row=>row[0]==='AFM-0020-BASELINE-METHODS')+1;
    const preview=await book.render({sheetName:'InterventionReference',range:`C${start}:D${start+1}`,scale:1});
    await fs.writeFile('build/authoring/ankle-shared-review-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Existing shared ankle style saved; no edits.');
  } else if (process.argv.includes('--inspect-ankle-medial-lateral')) {
    const sheet=book.worksheets.getItem('InterventionReference');
    const start=sheet.getUsedRange().values.findIndex(row=>row[0]==='AFM-0030-SENSITIVITY-LOAD')+1;
    const preview=await book.render({sheetName:'InterventionReference',range:`C${start}:D${start+1}`,scale:1});
    await fs.writeFile('build/authoring/ankle-medial-lateral-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Existing ankle reference style saved; no edits.');
  } else if (process.argv.includes('--inspect-ankle-front-achilles')) {
    const current=rows(book.worksheets.getItem('InterventionReference'));
    const start=current.rows.findIndex(row=>row.Reference_ID==='AFM-0029-TENDERNESS-1')+2;
    const preview=await book.render({sheetName:'InterventionReference',range:`C${start}:D${start+3}`,scale:1});
    await fs.writeFile('build/authoring/ankle-front-achilles-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Ankle/Achilles preview saved; no edits.');
  } else if (process.argv.includes('--inspect-location-hints')) {
    const current=rows(book.worksheets.getItem('FindingFeature'));
    const start=current.rows.findIndex(row=>row.Feature_ID==='AFM-0019-PAIN')+2;
    const preview=await book.render({sheetName:'FindingFeature',range:`C${start}:E${start}`,scale:1});
    await fs.writeFile('build/authoring/location-hints-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Location hint preview saved; no edits.');
  } else if (process.argv.includes('--inspect-treatment-gaps')) {
    const current=rows(book.worksheets.getItem('FindingFeature'));
    const start=current.rows.findIndex(row=>row.Feature_ID==='AFM-0025-PAIN')+2;
    const preview=await book.render({sheetName:'FindingFeature',range:`C${start}:E${start}`,scale:1});
    await fs.writeFile('build/authoring/treatment-gaps-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Treatment gap preview saved; no edits.');
  } else if (process.argv.includes('--inspect-posterior')) {
    const sheet=book.worksheets.getItem('FindingFeature'),current=rows(sheet);
    const start=current.rows.findIndex(row=>row.Feature_ID==='AFM-0044-TENSION')+2;
    const preview=await book.render({sheetName:'FindingFeature',range:`C${start}:E${start+1}`,scale:1});
    await fs.writeFile('build/authoring/posterior-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Posterior preview saved; no edits.');
  } else if (process.argv.includes('--inspect-lateral')) {
    const sheet=book.worksheets.getItem('InterventionReference'), current=rows(sheet);
    const start=current.rows.findIndex(row=>row.Reference_ID==='AFM-0042-TENSION-1')+2;
    const preview=await book.render({sheetName:'InterventionReference',range:`C${start}:D${start+2}`,scale:1});
    await fs.writeFile('build/authoring/lateral-before.png',new Uint8Array(await preview.arrayBuffer()));
    console.log('Lateral reference preview saved; no edits.');
  } else if (process.argv.includes('--inspect')) {
    const image = await book.render({ sheetName: 'ConsultationGuide', range: 'B1:D7', scale: 1 });
    await fs.writeFile('build/authoring/knee-calf-before.png', new Uint8Array(await image.arrayBuffer()));
    console.log('Existing consultation preview saved; no edits.');
  } else {
    const medial = process.argv.includes('--medial'), anterior = process.argv.includes('--anterior'),lateral=process.argv.includes('--lateral'),posterior=process.argv.includes('--posterior');
    const gaps=process.argv.includes('--treatment-gaps'),hints=process.argv.includes('--location-hints');
    const ankle=process.argv.includes('--ankle-front-achilles'),ankleSides=process.argv.includes('--ankle-medial-lateral');
    const ankleShared=process.argv.includes('--ankle-shared-review');
    const backup = ankleShared ? 'build/authoring/backups/ankle-shared-review-20261001' : ankleSides ? 'build/authoring/backups/ankle-medial-lateral-20261001' : ankle ? 'build/authoring/backups/ankle-front-achilles-20261001' : hints ? 'build/authoring/backups/location-hints-20261001' : gaps ? 'build/authoring/backups/treatment-gaps-20261001' : posterior ? 'build/authoring/backups/lower-leg-posterior-20261001' : lateral ? 'build/authoring/backups/lower-leg-lateral-20260930' : anterior ? 'build/authoring/backups/lower-leg-anterior-20260930' : medial ? 'build/authoring/backups/lower-leg-medial-correction-20260930' : 'build/authoring/backups/knee-calf-pilot-20260930';
    await fs.mkdir(backup, { recursive: true });
    try { await fs.copyFile(path, `${backup}/RehabMind_ClinicalExtension_v1.1.xlsx`, (await import('node:fs')).constants.COPYFILE_EXCL); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    console.log(JSON.stringify(ankleShared ? await applyAnkleSharedReview(book) : ankleSides ? await applyAnkleMedialLateral(book) : ankle ? await applyAnkleFrontAchilles(book) : hints ? await applyLocationReviewHints(book) : gaps ? await applyTreatmentGapRepair(book) : posterior ? await applyLowerLegPosterior(book) : lateral ? await applyLowerLegLateral(book) : anterior ? await applyLowerLegAnterior(book) : medial ? await applyLowerLegMedial(book) : await applyKneeCalfPilot(book)));
    book.recalculate();
    const ankleRefs=ankle ? rows(book.worksheets.getItem('InterventionReference')) : null;
    const ankleStart=ankleRefs ? book.worksheets.getItem('InterventionReference').getUsedRange().values.findIndex(row=>row[0]==='AFM-0029-TENDERNESS-LOAD')+1 : 0;
    const sideStart=ankleSides ? book.worksheets.getItem('InterventionReference').getUsedRange().values.findIndex(row=>row[0]==='AFM-0027-NERVE-MOBILITY')+1 : 0;
    const sharedStart=ankleShared ? book.worksheets.getItem('InterventionReference').getUsedRange().values.findIndex(row=>row[0]==='AFM-0048-LENGTH-STRETCH')+1 : 0;
    const previews = ankleShared ? [['InterventionReference',`C${sharedStart}:D${sharedStart+1}`,'ankle-shared-review-methods']] : ankleSides ? [['InterventionReference',`C${sideStart}:D${sideStart+3}`,'ankle-medial-lateral-methods']] : ankle ? [['InterventionReference',`C${ankleStart}:D${ankleStart+3}`,'ankle-front-achilles-methods']] : hints ? [['FindingFeature','H158:I158','location-hints']] : gaps ? [['InterventionReference','C186:D192','treatment-gaps-methods']] : posterior ? [
      ['LocationGuide','B8:E9','posterior-locations'],['ConsultationGuide','B32:D35','posterior-questions'],
      ['FindingFeature','C172:E176','posterior-findings'],['InterventionReference','C181:D185','posterior-methods']
    ] : lateral ? [['LocationGuide','B7:E7','lateral-location'],['ConsultationGuide','B28:D31','lateral-questions'],['FindingFeature','C165:E169','lateral-findings'],['InterventionReference','C173:D177','lateral-methods']] : anterior ? [['LocationGuide','B5:E6','anterior-locations'],['ConsultationGuide','B20:D23','anterior-questions'],['FindingFeature','C161:E164','anterior-findings'],['InterventionReference','C164:D167','anterior-methods']] : medial ? [['LocationGuide','F3:G4','medial-primary'],['FindingFeature','C151:E151','medial-local-tension'],['InterventionReference','C158:D162','medial-local-methods']] :
      [['LocationGuide', 'B1:E2', 'location'], ['ConsultationGuide', 'B8:D11', 'questions'], ['FindingFeature', 'C137:E139', 'features']];
    for (const [sheetName, range, name] of previews) {
      const preview = await book.render({ sheetName, range, scale: 1 });
      await fs.writeFile(`build/authoring/knee-calf-${name}.png`, new Uint8Array(await preview.arrayBuffer()));
    }
    console.log((await book.inspect({kind:'match', searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?', options:{useRegex:true,maxResults:10}, maxChars:1200})).ndjson);
    await (await SpreadsheetFile.exportXlsx(book)).save(path);
  }
}
