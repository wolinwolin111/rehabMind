import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const batchNumber = Number(process.argv.find(value => value.startsWith('--batch='))?.split('=')[1] || 1);
async function specifications(onlyBatch) {
  const files = (await fs.readdir('knowledge/review')).filter(name => /^(clinical|static)_remediation_batch\d+_v1\.json$/.test(name) && (!onlyBatch || name.startsWith('clinical_'))).sort((a,b) => Number(a.startsWith('static_'))-Number(b.startsWith('static_')) || Number(a.match(/batch(\d+)/)[1])-Number(b.match(/batch(\d+)/)[1]));
  const specs = await Promise.all(files.map(name => fs.readFile(`knowledge/review/${name}`,'utf8').then(JSON.parse)));
  if(!onlyBatch)specs.push(JSON.parse(await fs.readFile('knowledge/review/toe_locations_v1.json','utf8')));
  return onlyBatch ? specs.filter(spec => spec.batch === onlyBatch) : specs;
}
const paths = ['knowledge/RehabMind_KnowledgeDB_v3.8.xlsx', 'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx'];
const specFields = {ClinicalPurpose:'purposes', FindingFeature:'features', InterventionReference:'references', ConsultationGuide:'guides', LocationGuide:'locations'};

// Apply approved content last, after the historical batches. Only named cells change.
export async function applyClinicalRemediation(main, extension, onlyBatch) {
  const changes = [];
  for (const spec of await specifications(onlyBatch)) {
  for (const [book, section] of [[main, 'main'], [extension, 'extension']]) {
    for (const [sheetName, records] of Object.entries(spec[section])) {
      const sheet = book.worksheets.getItem(sheetName), values = sheet.getUsedRange().values;
      const headers = values[0];
      if(sheetName==='LocationGuide'&&!headers.includes('Auto_Apply_To_Region')){
        sheet.getRangeByIndexes(0,headers.length,1,1).values=[['Auto_Apply_To_Region']];
        headers.push('Auto_Apply_To_Region');
      }
      for (const [id, fields] of Object.entries(records)) {
        let row = values.findIndex((record, index) => index > 0 && record[0] === id);
        if (row < 1) {
          if (fields[headers[0]] !== id || headers.some(field => field && field!=='Auto_Apply_To_Region' && !(field in fields))) throw Error(`Incomplete new record ${sheetName}/${id}`);
          row = values.length;
          sheet.getRangeByIndexes(row,0,1,headers.length).values = [headers.map(field=>fields[field]??null)];
          sheet.getRangeByIndexes(row,0,1,headers.length).format={font:{name:'Microsoft YaHei',size:11,color:'#293B58'},wrapText:true,verticalAlignment:'top',rowHeight:80};
          values.push(headers.map(field=>fields[field]??null));
          changes.push({book:section,sheet:sheetName,id,field:'$record',before:null,after:fields});
        }
        for (const [field, after] of Object.entries(fields)) {
          const column = headers.indexOf(field);
          if (column < 0) throw Error(`Missing correction field ${sheetName}/${field}`);
          const before = values[row][column] ?? null;
          if (before === after) continue;
          sheet.getRangeByIndexes(row, column, 1, 1).values = [[after]];
          changes.push({book: section, sheet: sheetName, id, field, before, after});
        }
      }
    }
  }
  }
  return changes;
}

// Keep the compiled completion specification consistent with the final workbook overlay.
export async function amendCompletionSpecification(completion, source) {
  for (const spec of await specifications()) {
  Object.assign(completion.gap_dispositions??={},spec.gap_dispositions??{});
  for (const [sheet, records] of Object.entries(spec.extension)) {
    // Dimension copy is owned by the final workbook overlay, not the completion catalogue.
    if (sheet === 'DimensionGuide') continue;
    const list = completion[specFields[sheet]] ??= [];
    for (const [id, patch] of Object.entries(records)) {
      const key = {ClinicalPurpose:'Item_ID', FindingFeature:'Feature_ID', InterventionReference:'Reference_ID', ConsultationGuide:'Guide_ID', LocationGuide:'Area_ID'}[sheet];
      if (!key) throw Error(`Unsupported extension table ${sheet}`);
      const target = list.find(row => row[key] === id);
      if (target) Object.assign(target, patch);
      else {
        const original = source.clinical_extension[sheet].find(row => row[key] === id);
        if (original || patch[key] === id) list.push({...original, ...patch});
        // Some references come from later batches; the workbook overlay owns those edits.
      }
    }
  }
  for (const [sheet, records] of Object.entries(spec.main)) {
    const key = Object.keys(source.tables[sheet][0])[0];
    const list = completion.main_updates[sheet] ??= [];
    for (const [id, patch] of Object.entries(records)) {
      const target = list.find(row => row[key] === id);
      if (target) Object.assign(target, patch);
      else {
        const original = source.tables[sheet].find(row => row[key] === id);
        if (!original && patch[key] !== id) throw Error(`Missing source ${sheet}/${id}`);
        list.push({...original, ...patch});
      }
    }
  }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const main = await SpreadsheetFile.importXlsx(await FileBlob.load(paths[0]));
  const extension = await SpreadsheetFile.importXlsx(await FileBlob.load(paths[1]));
  const sheet = extension.worksheets.getItem('FindingFeature');
  const previewId = {1:'AFM-0022-LIMIT',2:'AFM-0106-PAIN',3:'AFM-0090-CAPACITY',4:'AFM-0047-LENGTH'}[batchNumber];
  const row = sheet.getUsedRange().values.findIndex(value => value[0] === previewId) + 1;
  const previewPath = `build/authoring/clinical-batch${batchNumber}-${process.argv.includes('--inspect') ? 'before' : 'after'}.png`;
  if (process.argv.includes('--inspect')) {
    await fs.writeFile(previewPath, new Uint8Array(await (await extension.render({sheetName:'FindingFeature',range:`C${row}:E${row}`,scale:1})).arrayBuffer()));
    console.log('Read-only workbook preview saved.');
  } else {
    const backup = `build/authoring/backups/clinical-batch${batchNumber}-20261001`;
    await fs.mkdir(backup, {recursive:true});
    for (const path of [...paths, 'build/knowledge/runtime.json']) {
      try {await fs.copyFile(path, `${backup}/${path.split('/').at(-1)}`, (await import('node:fs')).constants.COPYFILE_EXCL);}
      catch(error) {if(error.code !== 'EEXIST') throw error;}
    }
    const changes = await applyClinicalRemediation(main, extension, batchNumber);
    main.recalculate(); extension.recalculate();
    console.log((await extension.inspect({kind:'table',range:`FindingFeature!C${row}:E${row}`,include:'values',tableMaxRows:1,tableMaxCols:3,maxChars:800})).ndjson);
    await fs.writeFile(previewPath, new Uint8Array(await (await extension.render({sheetName:'FindingFeature',range:`C${row}:E${row}`,scale:1})).arrayBuffer()));
    for (const [book, path] of [[main, paths[0]], [extension, paths[1]]]) await (await SpreadsheetFile.exportXlsx(book)).save(path);
    if (changes.length) {
      const changePath=`knowledge/review/clinical_remediation_batch${batchNumber}_changes.json`;
      const previous=await fs.readFile(changePath,'utf8').then(JSON.parse).catch(error=>{if(error.code!=='ENOENT')throw error;return {changes:[]};});
      await fs.writeFile(changePath,JSON.stringify({date:'2026-10-01',changes:[...previous.changes,...changes]},null,2));
    }
    console.log(JSON.stringify({changed_cells:changes.length,backup}));
  }
}
