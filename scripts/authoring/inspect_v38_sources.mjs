import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { FileBlob, SpreadsheetFile } = require('@oai/artifact-tool');
for (const [name, path, sheet, range] of [
  ['main', 'baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/02_Database/RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx', '07_ContextRule', 'A1:E5'],
  ['extension', 'knowledge/RehabMind_ClinicalExtension_v1.0_Draft.xlsx', 'ClinicalPurpose', 'A1:D4'],
]) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path));
  console.log(name, (await workbook.inspect({kind:'sheet',include:'id,name'})).ndjson);
  if(name==='main')console.log('evidence',JSON.stringify(workbook.worksheets.getItem('09_Evidence').getRange('A1:G3').values));
  const preview = await workbook.render({sheetName:sheet,range,scale:1});
  await fs.writeFile(`build/authoring/v38-${name}-before.png`,new Uint8Array(await preview.arrayBuffer()));
}
