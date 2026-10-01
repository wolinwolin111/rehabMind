// CURRENT IMPLEMENTATION REFERENCE
// Extracted verbatim from LowerLimb_v3.4_G5_88_4Module_ProfileContext_UserReadable_v5.html
// Purpose: preserve current spatial mapping behavior for reimplementation.
// Clinical knowledge must NOT be added here.

// v3.3 four-module 3D localization extension.
// Existing SEMMETA remains the source for Knee + Ankle/Foot. Lower-leg and thigh use a calibrated surface-geometry fallback only when a face has no existing semantic label.
const EXTENDED_SURFACE_AREAS=[
 {code:101,clinicalSubregionId:'REG-LL-ANT-MUS',displayName:'小腿前侧肌腹区',workspaceDisplayName:'小腿前侧',nearbyAnatomy:[{concept:'tibialis anterior'},{concept:'extensor hallucis longus'},{concept:'extensor digitorum longus'}]},
 {code:102,clinicalSubregionId:'REG-LL-ANT-TIBIA',displayName:'胫骨前缘/前侧骨面',workspaceDisplayName:'胫骨前侧',nearbyAnatomy:[{concept:'anterior tibial crest / cortex'},{concept:'tibialis anterior (adjacent)'}]},
 {code:103,clinicalSubregionId:'REG-LL-MED-TIBIA',displayName:'胫骨内侧缘/后内侧骨面',workspaceDisplayName:'胫骨内侧',nearbyAnatomy:[{concept:'medial tibial border'},{concept:'posteromedial tibial surface'}]},
 {code:104,clinicalSubregionId:'REG-LL-LAT-PER',displayName:'小腿外侧/腓骨肌群区',workspaceDisplayName:'小腿外侧',nearbyAnatomy:[{concept:'fibularis longus'},{concept:'fibularis brevis'},{concept:'fibula'}]},
 {code:105,clinicalSubregionId:'REG-LL-POST-GASTROC',displayName:'小腿后侧上段/腓肠肌区',workspaceDisplayName:'小腿后侧',nearbyAnatomy:[{concept:'medial gastrocnemius'},{concept:'lateral gastrocnemius'}]},
 {code:106,clinicalSubregionId:'REG-LL-POST-SOLEUS',displayName:'小腿后侧中下段/比目鱼肌区',workspaceDisplayName:'小腿后侧',nearbyAnatomy:[{concept:'soleus'},{concept:'distal superficial posterior compartment'}]},
 {code:107,clinicalSubregionId:'REG-LL-POSTMED-DEEP',displayName:'小腿后内侧深层/胫后-长屈肌群区',workspaceDisplayName:'小腿后内侧',nearbyAnatomy:[{concept:'tibialis posterior'},{concept:'flexor digitorum longus'},{concept:'flexor hallucis longus'}]},
 {code:108,clinicalSubregionId:'REG-THIGH-ANT',displayName:'大腿前侧/股四头肌区',workspaceDisplayName:'大腿前侧',nearbyAnatomy:[{concept:'rectus femoris'},{concept:'vastus lateralis'},{concept:'vastus medialis'},{concept:'vastus intermedius'}]},
 {code:109,clinicalSubregionId:'REG-THIGH-POST',displayName:'大腿后侧/腘绳肌区',workspaceDisplayName:'大腿后侧',nearbyAnatomy:[{concept:'biceps femoris'},{concept:'semitendinosus'},{concept:'semimembranosus'}]},
 {code:110,clinicalSubregionId:'REG-THIGH-MED',displayName:'大腿内侧/内收肌区',workspaceDisplayName:'大腿内侧',nearbyAnatomy:[{concept:'adductor longus'},{concept:'adductor brevis'},{concept:'adductor magnus'},{concept:'gracilis'}]},
 {code:111,clinicalSubregionId:'REG-THIGH-LAT',displayName:'大腿外侧/股外侧-髂胫束周围',workspaceDisplayName:'大腿外侧',nearbyAnatomy:[{concept:'vastus lateralis'},{concept:'tensor fasciae latae'},{concept:'iliotibial tract'}]}
];
EXTENDED_SURFACE_AREAS.forEach(a=>areaByCode.set(a.code,a));
const EXT_AREA_BY_L2=new Map(EXTENDED_SURFACE_AREAS.map(a=>[a.clinicalSubregionId,a]));
function extendedAreaForPoint(point){
 if(!point)return null;
 const x=Number(point.x),y=Number(point.y),z=Number(point.z),ax=Math.abs(x);
 let l2=null;
 // Lower leg: calibrated from the embedded Skin geometry and lower-leg muscle/bone bounds.
 if(y>=0.145&&y<=0.405&&ax>=0.020&&ax<=0.155&&z>=-0.125&&z<=0.045){
   const nx=(ax-0.080)/0.058, nz=(z+0.045)/0.066;
   if(nz>=0.52&&Math.abs(nx)<=1.25) l2=nx<-0.12?'REG-LL-ANT-TIBIA':'REG-LL-ANT-MUS';
   else if(nx>=0.62&&nz>-0.80) l2='REG-LL-LAT-PER';
   else if(nx<=-0.62) l2=nz<-0.28?'REG-LL-POSTMED-DEEP':'REG-LL-MED-TIBIA';
   else if(nx<-0.15&&nz<-0.45) l2='REG-LL-POSTMED-DEEP';
   else if(nz<-0.38) l2=y>=0.285?'REG-LL-POST-GASTROC':'REG-LL-POST-SOLEUS';
   else if(nz>=0.10) l2=nx<-0.25?'REG-LL-ANT-TIBIA':(nx>0.55?'REG-LL-LAT-PER':'REG-LL-ANT-MUS');
   else if(nx<-0.25) l2='REG-LL-MED-TIBIA';
   else if(nx>0.45) l2='REG-LL-LAT-PER';
   else l2=y<0.285?'REG-LL-POST-SOLEUS':'REG-LL-POST-GASTROC';
 }
 // Thigh: four-face V1 entry. Stop proximally before the hip/groin boundary.
 else if(y>=0.505&&y<=0.860&&ax>=0.020&&ax<=0.180&&z>=-0.145&&z<=0.085){
   const nx=(ax-0.092)/0.072, nz=(z+0.018)/0.088;
   if(Math.abs(nz)>=Math.abs(nx)) l2=nz>=0?'REG-THIGH-ANT':'REG-THIGH-POST';
   else l2=nx>=0?'REG-THIGH-LAT':'REG-THIGH-MED';
 }
 return l2?EXT_AREA_BY_L2.get(l2)||null:null;
}
function resolvedSurfaceArea(faceIndex,point){
 const s=faceSemantic(faceIndex),semanticArea=areaByCode.get(s.primary)||null;
 if(semanticArea)return {area:semanticArea,code:s.primary,confidence:s.confidence,alternative:s.alternative,source:'SEMMETA'};
 const area=extendedAreaForPoint(point);
 return area?{area,code:area.code,confidence:.68,alternative:0,source:'GEOMETRY_FALLBACK'}:{area:null,code:0,confidence:s.confidence||0,alternative:s.alternative||0,source:'NONE'};
}
window.G5LocalizationV33={version:'localization-v1.1-four-module',releaseState:'internal_validation_4module',ankleFoot:'SEMMETA_TO_12_L3',lowerLeg:'GEOMETRY_FALLBACK_7_L3',thigh:'GEOMETRY_FALLBACK_4_L3',hipBoundaryY:0.860,lowerLegBounds:{y:[0.145,0.405],absX:[0.020,0.155],z:[-0.125,0.045]},thighBounds:{y:[0.505,0.860],absX:[0.020,0.180],z:[-0.145,0.085]}};

const LOCALIZATION_RUNTIME={"version":"localization-v1.1-four-module","releaseState":"internal_validation_4module","l2ToL3":{"REG-KNEE-ANT-SUP":"L3-KNEE-ANT-PATELLA","REG-KNEE-ANT-PERI":"L3-KNEE-ANT-PATELLA","REG-KNEE-ANT-INF":"L3-KNEE-ANT-INFRAPATELLAR","REG-KNEE-MED-JL":"L3-KNEE-MED-JOINTLINE","REG-KNEE-MED-MCL":"L3-KNEE-MED-JOINTLINE","REG-KNEE-MED-PES":"L3-KNEE-MED-INFEROPATELLAR","REG-KNEE-MED-POST":"L3-KNEE-MED-POSTEROMEDIAL","REG-KNEE-LAT-JL":"L3-KNEE-LAT-JOINTLINE","REG-KNEE-LAT-FIB":"L3-KNEE-LAT-FIBHEAD","REG-KNEE-LAT-EPI":"L3-KNEE-LAT-SOFTTISSUE","REG-KNEE-LAT-POST":"L3-KNEE-LAT-SOFTTISSUE","REG-KNEE-POST-CENT":"L3-KNEE-POST-POPLITEAL","REG-KNEE-POST-MED":"L3-KNEE-POST-POPLITEAL","REG-KNEE-POST-LAT":"L3-KNEE-POST-POSTEROLAT","REG-KNEE-POST-CALF":"L3-KNEE-POST-POPLITEAL","REG-ANKLE-ANT-LAT":"AF-R-001","REG-ANKLE-ANT-MED":"AF-R-001","REG-ANKLE-MED-MAL":"AF-R-002","REG-ANKLE-MED-POST":"AF-R-002","REG-ANKLE-LAT-ATFL":"AF-R-003","REG-ANKLE-LAT-CFL":"AF-R-003","REG-ANKLE-LAT-PER":"AF-R-003","REG-ACHILLES-MID":"AF-R-004","REG-ACHILLES-INS":"AF-R-005","REG-HEEL-POST":"AF-R-005","REG-HEEL-PLANTAR":"AF-R-006","REG-FOOT-PLANTAR-MED":"AF-R-007","REG-FOOT-ARCH":"AF-R-008","REG-FOOT-LAT":"AF-R-009","REG-FOOT-PLANTAR-LAT":"AF-R-009","REG-ANKLE-DORSUM":"AF-R-010","REG-FOOT-FORE-CENT":"AF-R-011","REG-FOOT-FORE-MED":"AF-R-012","REG-LL-ANT-MUS":"LL-R-001","REG-LL-ANT-TIBIA":"LL-R-002","REG-LL-MED-TIBIA":"LL-R-003","REG-LL-LAT-PER":"LL-R-004","REG-LL-POST-GASTROC":"LL-R-005","REG-LL-POST-SOLEUS":"LL-R-006","REG-LL-POSTMED-DEEP":"LL-R-007","REG-THIGH-ANT":"THIGH-R-001","REG-THIGH-POST":"THIGH-R-002","REG-THIGH-MED":"THIGH-R-003","REG-THIGH-LAT":"THIGH-R-004"},"l3":{"L3-KNEE-ANT-PATELLA":{"name":"髌骨/髌周区域","region":"REG-KNEE-ANTERIOR"},"L3-KNEE-ANT-INFRAPATELLAR":{"name":"髌下/髌腱/胫骨结节前方区域","region":"REG-KNEE-ANTERIOR"},"L3-KNEE-MED-JOINTLINE":{"name":"膝内侧关节线区域","region":"REG-KNEE-MEDIAL"},"L3-KNEE-MED-INFEROPATELLAR":{"name":"髌骨内下缘/膝下内侧区域","region":"REG-KNEE-MEDIAL"},"L3-KNEE-MED-POSTEROMEDIAL":{"name":"膝后内侧/鹅足邻近区域","region":"REG-KNEE-MEDIAL"},"L3-KNEE-LAT-JOINTLINE":{"name":"膝外侧关节线区域","region":"REG-KNEE-LATERAL"},"L3-KNEE-LAT-FIBHEAD":{"name":"腓骨头/近端腓骨区域","region":"REG-KNEE-LATERAL"},"L3-KNEE-LAT-SOFTTISSUE":{"name":"膝外侧软组织带区域","region":"REG-KNEE-LATERAL"},"L3-KNEE-POST-POPLITEAL":{"name":"腘窝/膝后中央区域","region":"REG-KNEE-POSTERIOR"},"L3-KNEE-POST-POSTEROLAT":{"name":"膝后外侧/腓骨头后方区域","region":"REG-KNEE-POSTERIOR"},"AF-R-001":{"name":"前踝关节线/距小腿前方","region":"ANKLE_FOOT"},"AF-R-002":{"name":"内踝周围","region":"ANKLE_FOOT"},"AF-R-003":{"name":"外踝周围","region":"ANKLE_FOOT"},"AF-R-004":{"name":"跟腱近端/踝后方","region":"ANKLE_FOOT"},"AF-R-005":{"name":"跟腱止点/跟骨后方","region":"ANKLE_FOOT"},"AF-R-006":{"name":"跟骨底部/足跟垫区域","region":"ANKLE_FOOT"},"AF-R-007":{"name":"足弓内侧/足底筋膜走行区","region":"ANKLE_FOOT"},"AF-R-008":{"name":"舟骨/内侧中足邻近","region":"ANKLE_FOOT"},"AF-R-009":{"name":"第五跖骨基底/外侧中足","region":"ANKLE_FOOT"},"AF-R-010":{"name":"中足背侧","region":"ANKLE_FOOT"},"AF-R-011":{"name":"跖骨头区域","region":"ANKLE_FOOT"},"AF-R-012":{"name":"第一跖趾关节区域","region":"ANKLE_FOOT"},"LL-R-001":{"name":"小腿前侧肌腹区","region":"LOWER_LEG"},"LL-R-002":{"name":"胫骨前缘/前侧骨面","region":"LOWER_LEG"},"LL-R-003":{"name":"胫骨内侧缘/后内侧骨面","region":"LOWER_LEG"},"LL-R-004":{"name":"小腿外侧/腓骨肌群区","region":"LOWER_LEG"},"LL-R-005":{"name":"小腿后侧上段/腓肠肌区","region":"LOWER_LEG"},"LL-R-006":{"name":"小腿后侧中下段/比目鱼肌区","region":"LOWER_LEG"},"LL-R-007":{"name":"小腿后内侧深层/胫后-长屈肌群区","region":"LOWER_LEG"},"THIGH-R-001":{"name":"大腿前侧/股四头肌区","region":"THIGH"},"THIGH-R-002":{"name":"大腿后侧/腘绳肌区","region":"THIGH"},"THIGH-R-003":{"name":"大腿内侧/内收肌区","region":"THIGH"},"THIGH-R-004":{"name":"大腿外侧/股外侧-髂胫束周围","region":"THIGH"}},"lineAliases":{"L3-KNEE-MED-JOINTLINE":"内侧关节线","L3-KNEE-LAT-JOINTLINE":"外侧关节线"}};

const FINE_REGION_DEFS={
  'L4-KNEE-ANT-PAT-SUP':{name:'髌骨上缘 / 股四头肌腱邻近',parentL3:'L3-KNEE-ANT-PATELLA'},
  'L4-KNEE-ANT-PAT-MED':{name:'髌骨内侧缘',parentL3:'L3-KNEE-ANT-PATELLA'},
  'L4-KNEE-ANT-PAT-CENT':{name:'髌骨中央 / 髌前',parentL3:'L3-KNEE-ANT-PATELLA'},
  'L4-KNEE-ANT-PAT-LAT':{name:'髌骨外侧缘',parentL3:'L3-KNEE-ANT-PATELLA'},
  'L4-KNEE-ANT-PAT-INF':{name:'髌骨下缘',parentL3:'L3-KNEE-ANT-INFRAPATELLAR'},
  'L4-KNEE-ANT-PAT-TENDON':{name:'髌腱区域',parentL3:'L3-KNEE-ANT-INFRAPATELLAR'},
  'L4-KNEE-ANT-TIB-TUB':{name:'胫骨结节前方',parentL3:'L3-KNEE-ANT-INFRAPATELLAR'},

  'L4-KNEE-MED-JOINTLINE':{name:'膝内侧关节线',parentL3:'L3-KNEE-MED-JOINTLINE'},
  'L4-KNEE-MED-MCL':{name:'内侧副韧带邻近',parentL3:'L3-KNEE-MED-JOINTLINE'},
  'L4-KNEE-MED-PES':{name:'鹅足 / 膝内下侧',parentL3:'L3-KNEE-MED-INFEROPATELLAR'},
  'L4-KNEE-MED-POST':{name:'膝后内侧',parentL3:'L3-KNEE-MED-POSTEROMEDIAL'},

  'L4-KNEE-LAT-JOINTLINE':{name:'膝外侧关节线',parentL3:'L3-KNEE-LAT-JOINTLINE'},
  'L4-KNEE-LAT-EPI':{name:'外侧股骨髁 / 外侧软组织邻近',parentL3:'L3-KNEE-LAT-SOFTTISSUE'},
  'L4-KNEE-LAT-FIBHEAD':{name:'腓骨头 / 近端胫腓区域',parentL3:'L3-KNEE-LAT-FIBHEAD'},
  'L4-KNEE-LAT-POST':{name:'膝后外侧（外侧入口）',parentL3:'L3-KNEE-LAT-SOFTTISSUE'},

  'L4-KNEE-POST-CENT':{name:'腘窝中央',parentL3:'L3-KNEE-POST-POPLITEAL'},
  'L4-KNEE-POST-MED':{name:'膝后内侧（后侧入口）',parentL3:'L3-KNEE-MED-POSTEROMEDIAL'},
  'L4-KNEE-POST-LAT':{name:'膝后外侧 / 腓骨头后方',parentL3:'L3-KNEE-POST-POSTEROLAT'},
  'L4-KNEE-POST-CALF':{name:'近端小腿后侧',parentL3:'L3-KNEE-POST-POPLITEAL'}
};


const DIRECT_FINE_BY_L2={
  'REG-KNEE-ANT-SUP':'L4-KNEE-ANT-PAT-SUP',
  'REG-KNEE-MED-JL':'L4-KNEE-MED-JOINTLINE',
  'REG-KNEE-MED-MCL':'L4-KNEE-MED-MCL',
  'REG-KNEE-MED-PES':'L4-KNEE-MED-PES',
  'REG-KNEE-MED-POST':'L4-KNEE-MED-POST',
  'REG-KNEE-LAT-JL':'L4-KNEE-LAT-JOINTLINE',
  'REG-KNEE-LAT-EPI':'L4-KNEE-LAT-EPI',
  'REG-KNEE-LAT-FIB':'L4-KNEE-LAT-FIBHEAD',
  'REG-KNEE-LAT-POST':'L4-KNEE-LAT-POST',
  'REG-KNEE-POST-CENT':'L4-KNEE-POST-CENT',
  'REG-KNEE-POST-MED':'L4-KNEE-POST-MED',
  'REG-KNEE-POST-LAT':'L4-KNEE-POST-LAT',
  'REG-KNEE-POST-CALF':'L4-KNEE-POST-CALF'
};

// Geometry-calibrated centers measured from the embedded Skin mesh.
// x: mediolateral, y: cranio-caudal, z: anterior-posterior.
// For left knee, larger x = more lateral; for right knee the sign is reversed.
const KNEE_FINE_CALIBRATION={
  left:{patellaCenterX:0.0852},
  right:{patellaCenterX:-0.0882},
  patellaEdgeThreshold:0.014,
  infraY:{inferiorPatella:0.405,patellarTendon:0.365}
};

function fineDef(id){
  const d=FINE_REGION_DEFS[id];
  return d?{id,...d}:null;
}

function fineRegionForAreaPoint(area,point){
  if(!area||!area.clinicalSubregionId)return null;
  const l2=area.clinicalSubregionId;
  const direct=DIRECT_FINE_BY_L2[l2];
  if(direct)return fineDef(direct);

  if(l2==='REG-KNEE-ANT-PERI'){
    if(!point)return fineDef('L4-KNEE-ANT-PAT-CENT');
    const side=area.side==='right'?'right':'left';
    const sign=side==='left'?1:-1;
    const cx=KNEE_FINE_CALIBRATION[side].patellaCenterX;
    const lateral=(Number(point.x)-cx)*sign;
    if(lateral>KNEE_FINE_CALIBRATION.patellaEdgeThreshold)return fineDef('L4-KNEE-ANT-PAT-LAT');
    if(lateral<-KNEE_FINE_CALIBRATION.patellaEdgeThreshold)return fineDef('L4-KNEE-ANT-PAT-MED');
    return fineDef('L4-KNEE-ANT-PAT-CENT');
  }

  if(l2==='REG-KNEE-ANT-INF'){
    if(!point)return fineDef('L4-KNEE-ANT-PAT-TENDON');
    const y=Number(point.y);
    if(y>=KNEE_FINE_CALIBRATION.infraY.inferiorPatella)return fineDef('L4-KNEE-ANT-PAT-INF');
    if(y>=KNEE_FINE_CALIBRATION.infraY.patellarTendon)return fineDef('L4-KNEE-ANT-PAT-TENDON');
    return fineDef('L4-KNEE-ANT-TIB-TUB');
  }

  return null;
}

function aggregateFineVotes(){
  const rows=[...fineVotes.entries()]
    .sort((a,b)=>b[1]-a[1])
    .slice(0,5);
  const total=rows.reduce((s,x)=>s+x[1],0)||1;
  return rows.map(([id,w])=>({id,weight:w,pct:w/total,...FINE_REGION_DEFS[id]}));
}

function escRuntime(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function l3ForArea(area){if(!area)return null;const id=LOCALIZATION_RUNTIME.l2ToL3[area.clinicalSubregionId];if(!id)return null;const def=LOCALIZATION_RUNTIME.l3[id];return def?{id,...def}:null;}
function buildRuntimeFromAreaRows(areaRows,kind,fineRows=[]){
 const l3Weights=new Map();
 for(const row of areaRows||[]){const l3=l3ForArea(row.area);if(!l3)continue;const w=Number(row.pct??row.weight??1)||0;l3Weights.set(l3.id,(l3Weights.get(l3.id)||0)+w);}
 const l3List=[...l3Weights.entries()].map(([id,weight])=>({id,weight,...LOCALIZATION_RUNTIME.l3[id]})).sort((a,b)=>b.weight-a.weight);
 const lineAlias=(kind==='stroke')?l3List.find(x=>LOCALIZATION_RUNTIME.lineAliases[x.id]):null;
 const fineRegionList=(fineRows||[]).filter(x=>x?.id&&FINE_REGION_DEFS[x.id]);
 const fineRegion=fineRegionList[0]||null;
 return {l3List,lineAlias,fineRegion,fineRegionList,directions:[],releaseState:LOCALIZATION_RUNTIME.releaseState};
}
function renderRuntimeBlock(runtime){return '';}

