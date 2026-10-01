import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';
const wb = await SpreadsheetFile.importXlsx(await FileBlob.load(process.argv[3] || 'knowledge/RehabMind_ClinicalExtension_v1.0_Draft.xlsx'));
const result = await wb.render({ sheetName: 'InterventionReference', range: process.argv[2] || 'C16:E20', scale: 1.5 });
await fs.writeFile(process.argv[4] || 'build/authoring/local-tissue-preview.png', new Uint8Array(await result.arrayBuffer()));
