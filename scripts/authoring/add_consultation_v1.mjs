import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const extensionPath = 'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx';
const mainPath = 'knowledge/RehabMind_KnowledgeDB_v3.8.xlsx';
const specificationPath = 'knowledge/review/consultation_v1.json';
const fields = ['Guide_ID', 'Topic', 'Core_Prompt', 'Optional_Probe', 'Question_Purpose',
  'Information_Gained', 'Assessment_Help', 'Scope', 'Module_Codes', 'Region_IDs',
  'Display_Order', 'Input_Mode', 'Review_Status', 'Source_Reference', 'Internal_Note'];

export async function applyCommonFoundation(main, extension) {
  const specification = JSON.parse(await fs.readFile(specificationPath, 'utf8'));
  const existing = (await extension.inspect({ kind: 'sheet', include: 'name', maxChars: 4000 })).ndjson;
  const sheet = existing.includes('ConsultationGuide')
    ? extension.worksheets.getItem('ConsultationGuide') : extension.worksheets.add('ConsultationGuide');
  sheet.getRangeByIndexes(0, 0, specification.guides.length + 1, fields.length).values = [fields,
    ...specification.guides.map(row => fields.map(field => row[field] ?? null))];
  sheet.showGridLines = false;
  sheet.freezePanes.freezeRows(1);
  const body = sheet.getRange('A1:O7');
  body.format.font = { name: 'Microsoft YaHei', size: 11, color: '#293B58' };
  body.format.wrapText = true;
  body.format.verticalAlignment = 'top';
  body.format.columnWidth = 40;
  sheet.getRange('A1:A7').format.columnWidth = 19;
  sheet.getRange('B1:B7').format.columnWidth = 27;
  sheet.getRange('C1:G7').format.columnWidth = 54;
  sheet.getRange('H1:H7').format.columnWidth = 14;
  sheet.getRange('I1:I7').format.columnWidth = 47;
  sheet.getRange('K1:K7').format.columnWidth = 15;
  sheet.getRange('L1:M7').format.columnWidth = 22;
  sheet.getRange('N1:O7').format.columnWidth = 65;
  sheet.getRange('A1:O1').format = { fill: '#DDEBE7', font: { bold: true, color: '#29434A' }, rowHeight: 32 };
  sheet.getRange('A2:O7').format.rowHeight = 90;

  const rules = main.worksheets.getItem('07_ContextRule');
  const values = rules.getUsedRange().values;
  const headers = values[0];
  const labelColumn = headers.includes('public_label') ? headers.indexOf('public_label') : headers.length;
  const groupColumn = headers.includes('public_group') ? headers.indexOf('public_group') : labelColumn + 1;
  const idColumn = headers.indexOf('rule_id'), typeColumn = headers.indexOf('rule_type');
  const sourceColumn = headers.indexOf('source_context');
  const defaultGroup = { MOVEMENT: 'ACTIVITY', SYMPTOM: 'SYMPTOM', CHAIN: 'ASSOCIATED', SAFETY: 'RISK', PROFILE: 'INTERNAL' };
  for (const [column, heading] of [[labelColumn, 'public_label'], [groupColumn, 'public_group']]) {
    rules.getRangeByIndexes(0, column, values.length, 1).copyFrom(rules.getRangeByIndexes(0, sourceColumn, values.length, 1), 'all');
    rules.getRangeByIndexes(0, column, 1, 1).values = [[heading]];
  }
  const authored = values.slice(1).map(row => {
    const override = specification.context_overrides[row[idColumn]];
    const group = override?.group ?? (row[sourceColumn] === 'Knee' ? 'INTERNAL' : defaultGroup[row[typeColumn]]);
    const label = group === 'INTERNAL' ? null : override?.label ?? row[sourceColumn];
    return { id: row[idColumn], label, group };
  });
  rules.getRangeByIndexes(1, labelColumn, authored.length, 1).values = authored.map(row => [row.label]);
  rules.getRangeByIndexes(1, groupColumn, authored.length, 1).values = authored.map(row => [row.group]);
  rules.getRangeByIndexes(0, labelColumn, values.length, 1).format.columnWidth = 52;
  rules.getRangeByIndexes(0, groupColumn, values.length, 1).format.columnWidth = 18;
  const { applyKneeCalfPilot, applyLowerLegMedial, applyLowerLegAnterior, applyLowerLegLateral, applyLowerLegPosterior, applyTreatmentGapRepair, applyLocationReviewHints, applyAnkleFrontAchilles, applyAnkleMedialLateral, applyAnkleSharedReview } = await import('./apply_knee_calf_pilot.mjs');
  await applyKneeCalfPilot(extension);
  await applyLowerLegMedial(extension);
  await applyLowerLegAnterior(extension);
  await applyLowerLegLateral(extension);
  await applyLowerLegPosterior(extension);
  await applyTreatmentGapRepair(extension);
  await applyLocationReviewHints(extension);
  await applyAnkleFrontAchilles(extension);
  await applyAnkleMedialLateral(extension);
  await applyAnkleSharedReview(extension);
  const {applyLowerLimbCompletion} = await import('./apply_lower_limb_completion.mjs');
  await applyLowerLimbCompletion(main,extension);
  return { guides: specification.guides.length, internal_rules: authored.filter(row => row.group === 'INTERNAL').map(row => row.id) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const main = await SpreadsheetFile.importXlsx(await FileBlob.load(mainPath));
  const extension = await SpreadsheetFile.importXlsx(await FileBlob.load(extensionPath));
  const guideId = process.argv.find(value => value.startsWith('--guide='))?.slice('--guide='.length);
  if (process.argv.includes('--inspect')) {
    if (guideId) {
      const sheet = extension.worksheets.getItem('ConsultationGuide');
      const values = sheet.getUsedRange().values;
      const index = values.findIndex(row => row[0] === guideId);
      if (index < 1) throw new Error(`Unknown question: ${guideId}`);
      const preview = await extension.render({ sheetName: 'ConsultationGuide', range: `E${index + 1}:G${index + 1}`, scale: 1 });
      await fs.writeFile(`build/authoring/${guideId}-before.png`, new Uint8Array(await preview.arrayBuffer()));
      console.log(`Question preview saved for ${guideId}. No workbook changes.`);
      process.exit(0);
    }
    for (const [book, sheetName, range, name] of [[main, '07_ContextRule', 'A1:D7', 'consultation-main-before'],
      [extension, 'ClinicalPurpose', 'A1:D5', 'consultation-extension-before']]) {
      const preview = await book.render({ sheetName, range, scale: 1 });
      await fs.writeFile(`build/authoring/${name}.png`, new Uint8Array(await preview.arrayBuffer()));
    }
    console.log('Existing workbook previews saved. No workbook changes.');
  } else if (guideId) {
    const specification = JSON.parse(await fs.readFile(specificationPath, 'utf8'));
    const question = specification.guides.find(row => row.Guide_ID === guideId);
    if (!question) throw new Error(`Unknown question specification: ${guideId}`);
    const sheet = extension.worksheets.getItem('ConsultationGuide');
    const values = sheet.getUsedRange().values, headers = values[0];
    const index = values.findIndex(row => row[0] === guideId);
    if (index < 1) throw new Error(`Unknown database question: ${guideId}`);
    const backup = `build/authoring/backups/consultation-${guideId}-${Date.now()}`;
    await fs.mkdir(backup, { recursive: true });
    await fs.copyFile(extensionPath, `${backup}/RehabMind_ClinicalExtension_v1.1.xlsx`);
    const changedFields = ['Question_Purpose', 'Information_Gained', 'Assessment_Help', 'Internal_Note'];
    for (const field of changedFields) {
      sheet.getRangeByIndexes(index, headers.indexOf(field), 1, 1).values = [[question[field]]];
    }
    extension.recalculate();
    const preview = await extension.render({ sheetName: 'ConsultationGuide', range: `E${index + 1}:G${index + 1}`, scale: 1 });
    await fs.writeFile(`build/authoring/${guideId}-after.png`, new Uint8Array(await preview.arrayBuffer()));
    await (await SpreadsheetFile.exportXlsx(extension)).save(extensionPath);
    console.log(JSON.stringify({ guide_id: guideId, changed_fields: changedFields, backup }));
  } else {
    const backup = 'build/authoring/backups/common-foundation-20260930';
    await fs.mkdir(backup, { recursive: true });
    for (const path of [mainPath, extensionPath]) {
      const target = `${backup}/${path.split('/').at(-1)}`;
      try { await fs.copyFile(path, target, (await import('node:fs')).constants.COPYFILE_EXCL); }
      catch (error) { if (error.code !== 'EEXIST') throw error; }
    }
    const counts = await applyCommonFoundation(main, extension);
    main.recalculate(); extension.recalculate();
    console.log((await extension.inspect({ kind: 'table', range: 'ConsultationGuide!A1:G7', include: 'values',
      tableMaxRows: 7, tableMaxCols: 7, tableMaxCellChars: 70, maxChars: 1800 })).ndjson);
    const preview = await extension.render({ sheetName: 'ConsultationGuide', range: 'B1:D7', scale: 1 });
    await fs.writeFile('build/authoring/consultation-guide.png', new Uint8Array(await preview.arrayBuffer()));
    await (await SpreadsheetFile.exportXlsx(main)).save(mainPath);
    await (await SpreadsheetFile.exportXlsx(extension)).save(extensionPath);
    console.log(JSON.stringify(counts));
  }
}
