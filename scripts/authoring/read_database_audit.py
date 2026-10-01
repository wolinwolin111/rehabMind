"""Read both current workbooks without editing, and compare every runtime table."""
import hashlib
import json
from pathlib import Path
from openpyxl import load_workbook

root = Path(__file__).resolve().parents[2]
runtime = json.loads((root / 'build/knowledge/runtime.json').read_text(encoding='utf-8'))
issues, locations, books = [], {}, {}
for section, filename, hash_field in [
    ('tables', 'RehabMind_KnowledgeDB_v3.8.xlsx', 'workbook_sha256'),
    ('clinical_extension', 'RehabMind_ClinicalExtension_v1.1.xlsx', 'clinical_extension_sha256'),
]:
    path = root / 'knowledge' / filename
    book = load_workbook(path, read_only=True, data_only=False)
    actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual_hash != runtime[hash_field]:
        issues.append({'kind': 'stale_runtime_hash', 'file': filename})
    output = {}
    for sheet in book:
        values = sheet.iter_rows(values_only=True)
        headers = next(values)
        if not headers or not headers[0]:
            issues.append({'kind': 'empty_header', 'sheet': sheet.title})
            continue
        rows, seen = [], set()
        for number, row in enumerate(values, 2):
            if row[0] is None or not str(row[0]).strip():
                if any(value is not None for value in row):
                    issues.append({'kind': 'row_without_id', 'sheet': sheet.title, 'row': number})
                continue
            if row[0] in seen:
                issues.append({'kind': 'duplicate_id', 'sheet': sheet.title, 'id': row[0]})
            seen.add(row[0])
            record = {str(header): row[index] if index < len(row) else None
                      for index, header in enumerate(headers) if header}
            rows.append(record)
            locations[f'{sheet.title}/{row[0]}'] = number
            if any(isinstance(v, str) and v.startswith('=') for v in record.values()):
                issues.append({'kind': 'formula_requires_value_check', 'sheet': sheet.title, 'id': row[0]})
        output[sheet.title] = rows
        if sheet.title in runtime[section] and rows != runtime[section][sheet.title]:
            issues.append({'kind': 'runtime_table_difference', 'sheet': sheet.title})
    books[section] = output
    book.close()
snapshot = {**runtime, **books}
snapshot['audit_source'] = {'files': ['RehabMind_KnowledgeDB_v3.8.xlsx', 'RehabMind_ClinicalExtension_v1.1.xlsx'],
                          'issues': issues, 'row_locations': locations}
(root / 'build/authoring/database-audit-snapshot.json').write_text(
    json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'source': 'current_workbooks', 'workbook_runtime_issues': issues,
                  'tables': {k: len(v) for k, v in books['tables'].items()},
                  'extension': {k: len(v) for k, v in books['clinical_extension'].items()}}, ensure_ascii=False))
