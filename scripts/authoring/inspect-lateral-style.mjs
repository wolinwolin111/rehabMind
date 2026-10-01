import {FileBlob,SpreadsheetFile} from '@oai/artifact-tool';
const b=await SpreadsheetFile.importXlsx(await FileBlob.load('build/authoring/backups/lower-leg-lateral-20260930/RehabMind_ClinicalExtension_v1.1.xlsx'));
const r=b.worksheets.getItem('FindingFeature').getRange('A137:G137');
console.log(JSON.stringify({font:{name:r.format.font.name,size:r.format.font.size,color:r.format.font.color,bold:r.format.font.bold},wrap:r.format.wrapText,align:r.format.verticalAlignment,height:r.format.rowHeight}));
