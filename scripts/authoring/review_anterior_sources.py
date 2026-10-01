import json, pathlib, re, sys, hashlib

root = pathlib.Path(__file__).resolve().parents[2]
batch = 'foot-arch' if '--foot-arch' in sys.argv else 'ankle-shared-review' if '--ankle-shared-review' in sys.argv else 'ankle-medial-lateral' if '--ankle-medial-lateral' in sys.argv else 'ankle-front-achilles' if '--ankle-front-achilles' in sys.argv else 'treatment-gaps' if '--treatment-gaps' in sys.argv else 'posterior' if '--posterior' in sys.argv else 'lateral' if '--lateral' in sys.argv else 'anterior'
backup_date = '20261001' if batch in ('posterior', 'treatment-gaps', 'ankle-front-achilles', 'ankle-medial-lateral', 'ankle-shared-review', 'foot-arch') else '20260930'
index = json.loads((root / 'knowledge/review/local_record_sources.private.json').read_text(encoding='utf-8'))
if '--location-hints' in sys.argv and '--verify' in sys.argv:
    from openpyxl import load_workbook
    spec = json.loads((root / 'knowledge/review/location_review_hints_v1.json').read_text(encoding='utf-8'))
    before = load_workbook(root / 'build/authoring/backups/location-hints-20261001/RehabMind_ClinicalExtension_v1.1.xlsx')
    after = load_workbook(root / 'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx')
    assert before.sheetnames == after.sheetnames
    changed_ids = []
    for name in before.sheetnames:
        left, right = before[name], after[name]
        assert left.freeze_panes == right.freeze_panes
        assert left.sheet_view.showGridLines == right.sheet_view.showGridLines
        assert left.max_row == right.max_row
        assert left.max_column == right.max_column if name != 'FindingFeature' else right.max_column == left.max_column + 2
        for row in left:
            for cell in row:
                target = right[cell.coordinate]
                assert cell.value == target.value, (name,cell.coordinate,'value')
                assert cell._style == target._style, (name,cell.coordinate,'style')
            assert left.row_dimensions[row[0].row].height == right.row_dimensions[row[0].row].height
        for col,dim in left.column_dimensions.items():
            assert dim.width == right.column_dimensions[col].width, (name,col,'width')
        if name == 'FindingFeature':
            assert [right.cell(1,c).value for c in range(left.max_column+1,right.max_column+1)] == ['Related_Location_Prompt','Related_Location_Action_Label']
            hints = {h['Feature_ID']:h for h in spec['hints']}
            for row in right.iter_rows(min_row=2):
                fid = row[0].value
                actual = [row[-2].value,row[-1].value]
                expected = [hints[fid]['Related_Location_Prompt'],hints[fid]['Related_Location_Action_Label']] if fid in hints else [None,None]
                assert actual == expected, fid
                if fid in hints: changed_ids.append(fid)
    assert set(changed_ids) == {h['Feature_ID'] for h in spec['hints']}
    report = {'added_columns':2,'hinted_features':changed_ids,'original_values_styles_dimensions_preserved':True}
    (root / 'build/authoring/location-hints-preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False))
    sys.exit(0)
if '--verify' in sys.argv:
    from openpyxl import load_workbook
    spec_path = 'knowledge/review/foot_arch_v1.json' if batch == 'foot-arch' else 'knowledge/review/ankle_shared_review_v1.json' if batch == 'ankle-shared-review' else 'knowledge/review/ankle_medial_lateral_v1.json' if batch == 'ankle-medial-lateral' else 'knowledge/review/ankle_front_achilles_v1.json' if batch == 'ankle-front-achilles' else 'knowledge/review/treatment_gap_repair_v1.json' if batch == 'treatment-gaps' else f'knowledge/review/lower_leg_{batch}_v1.json'
    backup_dir = f'{batch}-{backup_date}' if batch in ('treatment-gaps','ankle-front-achilles','ankle-medial-lateral','ankle-shared-review','foot-arch') else f'lower-leg-{batch}-{backup_date}'
    spec = json.loads((root / spec_path).read_text(encoding='utf-8'))
    before = load_workbook(root / f'build/authoring/backups/{backup_dir}/RehabMind_ClinicalExtension_v1.1.xlsx')
    after = load_workbook(root / 'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx')
    allowed = {name: {row[next(iter(row))] for row in spec[field]} for name, field in
               [('LocationGuide','locations'),('ConsultationGuide','guides'),('ClinicalPurpose','purposes'),
                ('FindingFeature','features'),('InterventionReference','references')]}
    assert before.sheetnames == after.sheetnames
    changes = []
    totals = {}
    for name in before.sheetnames:
        left, right = before[name], after[name]
        assert left.freeze_panes == right.freeze_panes
        assert left.sheet_view.showGridLines == right.sheet_view.showGridLines
        assert list(left.values)[0] == list(right.values)[0]
        source = {row[0]:row for row in left.values if row[0]}
        target = {row[0]:row for row in right.values if row[0]}
        retired = set(spec.get('retired_features',[])) if name=='FindingFeature' else set(spec.get('retired_references',[])) if name=='InterventionReference' else set()
        assert set(source)-set(target) == retired, name
        for key, row in source.items():
            if key in retired:
                continue
            if row != target[key]:
                assert key in allowed.get(name,set()), (name,key)
                changes.append({'sheet':name,'id':key})
        added = set(target)-set(source)
        assert added <= allowed.get(name,set()), name
        totals[name] = {'records':len(target)-1,'added':len(added)}
        target_row = {row[0].value:row for row in right.iter_rows() if row[0].value}
        for row in left.iter_rows():
            if row[0].value in allowed.get(name,set()) or row[0].value in retired or row[0].value is None:
                continue
            target_cells=target_row[row[0].value]
            for column,cell in enumerate(row):
                assert cell.value == target_cells[column].value, (name,cell.coordinate)
                assert cell._style == target_cells[column]._style, (name,cell.coordinate,'style')
            assert left.row_dimensions[row[0].row].height==right.row_dimensions[target_cells[0].row].height,(name,row[0].value,'height')
    cited = set(re.findall(r'local-records://(LR-[0-9a-f]+)', json.dumps(spec)))
    files = {f['id']:f for f in index['files']}
    for sid in cited:
        source = files[sid]
        assert hashlib.sha256((pathlib.Path(index['root']) / source['file']).read_bytes()).hexdigest() == source['sha256'], sid
    report = {'existing_records_changed':changes,'totals':totals,'verified_local_sources':len(cited),
              'unrelated_values_and_styles_preserved':True}
    (root / f'build/authoring/lower-leg-{batch}-preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    sys.exit(0)
pattern = re.compile(r'足底|足弓|舟骨|拇展肌|拇收肌|趾短屈肌|足跟垫|短足') if batch == 'foot-arch' else re.compile(r'趾长屈肌|拇长屈肌|长屈趾肌|屈趾长肌|屈拇长肌|距下|跟骨.*松动|中足.*松动|骰骨.*松动') if batch == 'ankle-shared-review' else re.compile(r'胫骨后肌|腓骨长肌|腓骨短肌|长短腓骨肌|内踝|外踝|跗管|胫神经|踝.*贴|踝.*支具') if batch == 'ankle-medial-lateral' else re.compile(r'跟腱|前踝|距骨.*松动|距小腿.*松动|提踵') if batch == 'ankle-front-achilles' else re.compile(r'腓肠肌|比目鱼肌|小腿三头肌|提踵|跖屈') if batch == 'posterior' else re.compile(r'腓骨长肌|腓骨短肌|腓骨肌|外翻') if batch == 'lateral' else re.compile(r'胫骨前肌|胫前肌|拇长伸肌|趾长伸肌|第三腓骨肌')
matches = []
for source in index['files']:
    lines = (pathlib.Path(index['root']) / source['file']).read_text(encoding=source['encoding']).splitlines()
    for number, line in enumerate(lines, 1):
        hit = pattern.search(line)
        if hit:
            # Only the treatment/assessment fragment; never patient headings.
            fragment = line[max(0, hit.start()-8):hit.end()+100].strip()
            matches.append({'source_id': source['id'], 'line': number, 'fragment': fragment})
out = root / f'build/authoring/{batch}-record-evidence.json'
out.write_text(json.dumps(matches, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(matches[:55], ensure_ascii=False, indent=2))
print('MATCH_COUNT', len(matches))
if batch in ('posterior','ankle-front-achilles','ankle-medial-lateral','ankle-shared-review','foot-arch'):
    sys.exit(0)

data = json.loads((root / 'build/knowledge/runtime.json').read_text(encoding='utf-8'))
ids = {'CORE-MUS-PL','CORE-MUS-PB','CORE-CAP-EV','CORE-ROM-ANK-INV','LL-LT-004'} if batch == 'lateral' else {'CORE-MUS-TA','CORE-MUS-EHL','CORE-MUS-EDL','CORE-MUS-PT','CORE-CAP-DF','CORE-ROM-ANK-PF','LL-LT-001','LL-LT-002'}
maps = [r for r in data['tables']['08_AssessmentFindingMap'] if r['clinical_item_id'] in ids]
map_ids = {r['map_id'] for r in maps}
features = [r for r in data['clinical_extension']['FindingFeature'] if r['Assessment_Map_ID'] in map_ids]
feature_ids = {r['Feature_ID'] for r in features}
print('EXISTING_FEATURES', json.dumps(features, ensure_ascii=False, indent=2))
print('EXISTING_REFS', json.dumps([r for r in data['clinical_extension']['InterventionReference'] if r['Feature_ID'] in feature_ids], ensure_ascii=False, indent=2))
print('BASE_METHODS', json.dumps([r for r in data['tables']['04_Intervention'] if any(t in r['intervention_id'] for t in ('DF','EHL','EDL','PT','PF'))], ensure_ascii=False, indent=2))
