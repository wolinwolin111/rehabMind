import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledge} from '../api/knowledge.mjs';
import {resolveAssessment} from '../api/resolver.mjs';
import {meta,surface,report,mesh,localizeFace,chooseGestureRegion,rayAt} from './helpers/surface-atlas.mjs';
import * as T from 'three';
import {readFileSync} from 'node:fs';
const primary=r=>r.dimensions.flatMap(d=>d.groups.flatMap(g=>g.items)).filter(i=>i.display_mode==='DEFAULT');

test('new thigh entrances connect named source surfaces to their matching primary muscle',()=>{
  const cases=JSON.parse(readFileSync(new URL('./fixtures/common-thigh-tissue-surface.json',import.meta.url)));
  const itemFor={'rectus femoris':'CORE-MUS-RF','gracilis':'CORE-MUS-GRAC','adductor longus':'THIGH-MUS-AL'};
  for(const row of cases){
    const part=meta.muscles.parts.find(p=>p.id===row.source_part_id);
    assert.ok(part&&row.source_muscle_face>=part.firstFace&&row.source_muscle_face<part.firstFace+part.faceCount);
    assert.equal(part.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim(),row.name);
    const[x,y,z]=row.point,hit=localizeFace(meta,surface,row.face,{x,y,z});
    assert.equal(hit?.areaId,row.expected_area,`${row.side}/${row.name}`);assert.equal(hit.regionId,row.expected_region);
    assert.equal(primary(resolveAssessment(knowledge(),{localization_area_id:hit.areaId})).filter(i=>i.item_id===itemFor[row.name]).length,1);
  }
  assert.equal(cases.length,12);
});

test('every common-area specification is applied and its explicit subregion is reachable on both legs',()=>{
  const data=knowledge(),spec=JSON.parse(readFileSync(new URL('../knowledge/review/common_region_v1.json',import.meta.url)));
  const ids=new Set(),labels=new Set(),branches=new Set(),pending=[...surface.roots];
  while(pending.length){
    const value=pending.pop();
    if(value>=0){if(value)labels.add(value);continue;}
    const offset=-value-1;if(branches.has(offset))continue;branches.add(offset);
    for(let i=0;i<4;i++)pending.push(surface.nodes[offset+i]);
  }
  const reachable=[...labels].map(id=>meta.surface_atlas.entries[id]);
  for(const batch of spec.batches)for(const[id,record]of Object.entries(batch.extension.LocationGuide)){
    ids.add(id);assert.deepEqual(data.clinical_extension.LocationGuide.find(r=>r.Area_ID===id),record,id);
    const result=resolveAssessment(data,{localization_area_id:id});
    const visible=primary(result);
    for(const item of record.Primary_Item_IDs.split('|'))assert.ok(visible.some(i=>i.item_id===item&&i.possible_findings.length),`${id}/${item}`);
    for(const side of ['left','right'])assert.ok(reachable.some(hit=>hit.side===side&&(record.Auto_Apply_To_Region===false?hit.areaId===id:record.Region_IDs.split('|').includes(hit.regionId))),`${side}/${id}/surface`);
  }
  assert.equal(ids.size,32);
  assert.equal(data.tables['01_Region'].length,38);
  assert.equal(data.tables['02_ClinicalItem'].length,132);
});

test('gastrocnemius heads retain distinct source references and posterior calf priorities',()=>{
  const cases=JSON.parse(readFileSync(new URL('./fixtures/common-calf-tissue-surface.json',import.meta.url)));
  for(const row of cases){
    const part=meta.muscles.parts.find(p=>p.id===row.source_part_id);
    assert.ok(part&&row.source_face>=part.firstFace&&row.source_face<part.firstFace+part.faceCount);
    assert.equal(part.name.toLowerCase().replace(/\b(left|right)\b\s*/g,'').trim(),row.name);
    const[x,y,z]=row.point,hit=localizeFace(meta,surface,row.face,{x,y,z});
    assert.equal(hit?.areaId,row.expected_area,`${row.side}/${row.name}`);assert.equal(hit.regionId,'LL-R-005');
    const result=resolveAssessment(knowledge(),{localization_area_id:hit.areaId});
    for(const id of ['CORE-MUS-GASTROC','LL-LT-005','CORE-CAP-PF','CORE-ROM-ANK-DF'])assert.ok(primary(result).some(i=>i.item_id===id));
  }
  assert.equal(cases.length,8);
  assert.ok(primary(resolveAssessment(knowledge(),{localization_area_id:'LOC-LL-POSTMEDIAL'})).some(i=>i.item_id==='CORE-MUS-FHL'));
});

test('common knee entrances directly expose the anatomically related existing items',()=>{
  const cases=[
    ['KNEE-R-001',['CORE-MUS-RF','KNEE-LT-SUPRAPAT']],
    ['KNEE-R-002',['CORE-MUS-VL','KNEE-JNT-PF']],
    ['KNEE-R-003',['CORE-MUS-VM','KNEE-JNT-PF']],
    ['KNEE-R-007',['KNEE-LT-MEDIAL','KNEE-JNT-TIBROT']],
    ['KNEE-R-008',['CORE-MUS-SART','CORE-MUS-GRAC','CORE-MUS-ST','KNEE-CAP-PES']],
    ['KNEE-R-009',['CORE-MUS-SM','CORE-MUS-ST','KNEE-LT-POST']],
    ['KNEE-R-010',['KNEE-LT-LATERAL','KNEE-JNT-TIBROT']],
    ['KNEE-R-011',['CORE-MUS-BF','CORE-MUS-PL','KNEE-JNT-PROXTF']],
    ['KNEE-R-012',['CORE-MUS-VL','KNEE-MUS-LAT-CHAIN']],
    ['KNEE-R-013',['KNEE-LT-POST','KNEE-MUS-POPLIT']],
    ['KNEE-R-014',['CORE-MUS-BF','KNEE-LT-POST','KNEE-JNT-PROXTF']],
  ];
  for(const[region,ids]of cases){
    const result=resolveAssessment(knowledge(),{region_id:region});
    assert.equal(result.localization_area?.area_id,`LOC-${region}`);
    for(const id of ids){const item=primary(result).find(i=>i.item_id===id);assert.ok(item,`${region}/${id}`);assert.ok(item.possible_findings.length,`${region}/${id}/findings`);}
    assert.ok(result.related_tissues.length,region);
    assert.ok(result.consultation_guide.length,region);
    assert.equal(result.dimensions.find(d=>d.key==='FUNCTION')?.groups.flatMap(g=>g.items).filter(i=>i.display_mode==='DEFAULT').length||0,0);
  }
});

test('ankle posterior tendon territories keep nearby malleoli and Achilles separate',()=>{
  for(const side of ['left','right']){
    for(const [angle,area,region,muscle]of [
      [-120,'LOC-AF-MEDIAL-TENDONS','AF-R-002','CORE-MUS-TP'],
      [120,'LOC-AF-LATERAL-TENDONS','AF-R-003','CORE-MUS-PB'],
    ]){
      const hit=rayAt(side,.135,angle)?.selected;
      assert.equal(hit?.areaId,area,`${side}/${angle}`);assert.equal(hit.regionId,region);
      const result=resolveAssessment(knowledge(),{localization_area_id:area});
      assert.ok(primary(result).some(i=>i.item_id===muscle));
      assert.ok(primary(result).filter(i=>i.item_id.startsWith('AF-LT-')).flatMap(i=>i.possible_findings).some(f=>f.has_treatment));
    }
    for(const[angle,region]of [[-90,'AF-R-002'],[90,'AF-R-003'],[180,'AF-R-004'],[0,'AF-R-001']]){
      const hit=rayAt(side,.135,angle)?.selected;
      assert.equal(hit?.regionId,region,`${side}/${angle}`);assert.ok(!hit.areaId);
      assert.equal(resolveAssessment(knowledge(),{region_id:region}).localization_area.area_id,`LOC-${region}`);
    }
  }
});

test('plantar heel insertion and first MTP entrances use separate local priorities',()=>{
  for(const side of ['left','right']){
    const ref=report.foot_landmarks[side],sign=side==='left'?1:-1;
    const candidates=[
      ['heel centre',ref.heel.center,null,'AF-R-006','AF-LT-006'],
      ['medial plantar heel',[ref.heel.center[0]+sign*(ref.forward[0]*.018-ref.lateral[0]*.016),ref.heel.center[1],ref.heel.center[2]+ref.forward[1]*.018-ref.lateral[1]*.016],'LOC-AF-HEEL-MEDIAL','AF-R-006','AF-LT-007'],
      ['first MTP plantar',ref.metatarsals[0].head,'LOC-AF-FIRST-MTP-PLANTAR','AF-R-012','AF-LT-012'],
    ];
    for(const[name,point,area,region,item]of candidates){
      const hit=new T.Raycaster(new T.Vector3(point[0],-.2,point[2]),new T.Vector3(0,1,0)).intersectObject(mesh)[0];assert.ok(hit,name);
      const selected=localizeFace(meta,surface,hit.faceIndex,hit.point);
      assert.equal(selected?.regionId,region,`${side}/${name}`);assert.equal(selected?.areaId||null,area,`${side}/${name}`);
      const result=resolveAssessment(knowledge(),area?{localization_area_id:area}:{region_id:region});
      const local=primary(result).find(i=>i.item_id===item);assert.ok(local,`${name}/${item}`);
      assert.ok(local.possible_findings.some(f=>f.has_treatment||f.location_review),name);
    }
  }
});

test('patellar tendon and tibial insertion centres are separate on both sides; a broad circle reuses the parent',()=>{
  for(const side of ['left','right']){
    const hits=[];
    for(const[y,id]of [[.415,'LOC-KNEE-TIBIAL-TUBERCLE'],[.429,'LOC-KNEE-PATELLAR-TENDON']]){
      const rows=report.charts[side],lo=[...rows].reverse().find(r=>r.y<=y),hi=rows.find(r=>r.y>=y),t=hi.y===lo.y?0:(y-lo.y)/(hi.y-lo.y);
      const x=(side==='left'?1:-1)*(lo.tibial_front[0]+t*(hi.tibial_front[0]-lo.tibial_front[0]));
      const hit=new T.Raycaster(new T.Vector3(x,y,1),new T.Vector3(0,0,-1)).intersectObject(mesh)[0];assert.ok(hit);
      const selected=localizeFace(meta,surface,hit.faceIndex,hit.point);
      assert.equal(selected?.areaId,id,`${side}/${y}`);assert.equal(selected.regionId,'KNEE-R-006');
      const result=resolveAssessment(knowledge(),{localization_area_id:id});
      assert.ok(primary(result).some(i=>i.item_id==='KNEE-LT-INFRAPAT'));
      assert.ok(primary(result).flatMap(i=>i.possible_findings).some(f=>f.has_treatment));
      hits.push({hit:selected,count:8});
      assert.equal(chooseGestureRegion([{hit:selected,count:8}],true,meta.surface_atlas.gesture_groups,meta.surface_atlas.entries).areaId,id);
    }
    const broad=chooseGestureRegion(hits,true,meta.surface_atlas.gesture_groups,meta.surface_atlas.entries);
    assert.equal(broad.regionId,'KNEE-R-006');assert.ok(!broad.areaId);
    assert.equal(resolveAssessment(knowledge(),{region_id:broad.regionId}).localization_area.area_id,'LOC-KNEE-R-006');
  }
});
