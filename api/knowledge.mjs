import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = process.env.REHABMIND_KNOWLEDGE_FILE || resolve('build/knowledge/runtime.json');
let snapshot;

export function knowledge() {
  if (!snapshot) snapshot = JSON.parse(readFileSync(file, 'utf8'));
  return snapshot;
}

export function resetKnowledgeForTests() {
  snapshot = undefined;
}
