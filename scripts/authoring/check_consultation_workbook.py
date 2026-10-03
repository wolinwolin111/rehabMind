"""Read-only check: saved workbook changes must exactly match the consultation patch."""
import json
from copy import copy
from pathlib import Path
from openpyxl import load_workbook
root=Path(__file__).resolve().parents[2]
spec=json.loads((root/'knowledge/review/consultation_review_v1.json').read_text(encoding='utf-8'))
before=load_workbook(root/'build/authoring/consultation-before.xlsx')
after=load_workbook(root/'knowledge/RehabMind_ClinicalExtension_v1.1.xlsx')
assert before.sheetnames==after.sheetnames
modified=0
for name in before.sheetnames:
    a,b=before[name],after[name]
    assert a.freeze_panes==b.freeze_panes and str(a.merged_cells)==str(b.merged_cells),name
    assert len(a.tables)==len(b.tables),name
    assert len(a.data_validations.dataValidation)==len(b.data_validations.dataValidation),name
    headers=[c.value for c in a[1]]
    for row in a:
        key=a.cell(row[0].row,1).value
        allowed=spec['updates'].get(key,{}) if name=='ConsultationGuide' else {}
        for cell in row:
            actual=b.cell(cell.row,cell.column)
            if cell.value!=actual.value:
                field=headers[cell.column-1]
                assert field in allowed and allowed[field]==actual.value,(name,cell.coordinate)
                modified+=1
            for attr in ['font','fill','alignment','number_format']:
                assert copy(getattr(cell,attr))==copy(getattr(actual,attr)),(name,cell.coordinate,attr)
    if name!='ConsultationGuide':assert a.max_row==b.max_row,name
sheet=after['ConsultationGuide']
headers=[c.value for c in sheet[1]]
rows={r[0].value:{headers[i]:c.value for i,c in enumerate(r)} for r in list(sheet)[1:]}
for key,patch in spec['updates'].items():
    for field,value in patch.items():assert rows[key][field]==value,(key,field)
for patch in spec['additions']:
    for field,value in patch.items():assert rows[patch['Guide_ID']][field]==value,(patch['Guide_ID'],field)
assert len(rows)==101+len(spec['additions'])
report={'existing_records_reviewed':101,'existing_records_changed':len(spec['updates']),'modified_cells':modified,'new_records':len(spec['additions']),'other_sheets_and_existing_styles_preserved':True}
(root/'knowledge/review/consultation_workbook_verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
