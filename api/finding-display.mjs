import {completionNotes} from './completion-note-policy.mjs';
// Presentation-only audit. All displayed text continues to come from the workbook.
const notes = new Map([
  ['AFM-0125-SENSORY','提示'], ['AFM-0125-LATERAL','适用说明'], ['AFM-0125-MOTOR','提示'],
  ['AFM-0124-TENDON','适用说明'], ['AFM-0124-INTEGRITY','提示'],
  ['AFM-0065-TENSION', '适用说明'],
  ['AFM-0029-TENDERNESS', '适用说明'], ['AFM-0030-TENDERNESS', '适用说明'],
  ['AFM-0029-SWELLING', '提示'], ['AFM-0030-SWELLING', '提示'],
  ['AFM-0029-SENSITIVITY', '适用说明'], ['AFM-0030-SENSITIVITY', '适用说明'],
  ['AFM-0026-DORSIFLEXION', '提示'], ['AFM-0026-LOCALISE', '提示'],
  ['AFM-0027-TENDON', '适用说明'], ['AFM-0027-NERVE', '提示'],
  ['AFM-0027-BONE', '提示'], ['AFM-0028-BONE', '提示'],
  ['AFM-0047-LENGTH', '适用说明'], ['AFM-0048-LENGTH', '适用说明'],
  ['AFM-0028-TENDON', '提示'], ['AFM-0028-SNAPPING', '提示'],
  ['AFM-0078-PFP', '适用说明'], ['AFM-0078-TRAUMATIC-SWELLING', '适用说明'],
  ['AFM-0079-TENDON', '适用说明'], ['AFM-0079-FATPAD', '适用说明'],
  ['AFM-0079-TUBERCLE', '提示'], ['AFM-0080-PES', '适用说明'],
  ['AFM-0081-ITB', '适用说明'], ['AFM-0082-TENDERNESS', '适用说明'],
  ['AFM-0082-SWELLING', '提示'], ['AFM-0083-TRAUMATIC-SWELLING', '适用说明'],
  ['AFM-0058-SWELLING', '提示'],
  ['AFM-0056-FOCAL', '提示'], ['AFM-0060-PRESSURE', '适用说明'],
  ['AFM-0041-STATE', '适用说明'], ['AFM-0054-EXERTIONAL', '提示'],
  ['AFM-0055-FOCAL', '提示'], ['AFM-0055-SWELLING', '提示'],
  ['AFM-0057-BONE', '提示'], ['AFM-0057-EXERTIONAL', '提示'],
  ['AFM-0044-SENSITIVITY', '适用说明'], ['AFM-0058-PRESSURE', '适用说明'],
  ['AFM-0059-PRESSURE', '适用说明'], ['AFM-0059-SWELLING', '提示'],
  ['AFM-0058-EXERTIONAL', '提示'], ['AFM-0059-EXERTIONAL', '提示'],
  ...completionNotes,
]);

export function findingDisplayNote(feature) {
  const label = notes.get(feature.Feature_ID);
  return label && feature.Finding_Interpretation
    ? { label, text: feature.Finding_Interpretation }
    : null;
}
