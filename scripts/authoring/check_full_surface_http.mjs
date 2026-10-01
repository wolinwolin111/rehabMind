import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {decodeSurfaceAtlas,localizeFace,asBuffer} from '../../tests/helpers/surface-atlas.mjs';
const base='http://localhost:5173';
async function get(path){const r=await fetch(`${base}${path}`);assert.equal(r.status,200,path);return r;}
const meta=await(await get('/3d/skin.json')).json();
const raw=Buffer.from(await(await get('/3d/surface_atlas.bin')).arrayBuffer());
const skin=gunzipSync(Buffer.from(await(await get('/3d/skin.pack')).arrayBuffer()));
assert.deepEqual(raw,fs.readFileSync('public/3d/surface_atlas.bin'));
const atlas=decodeSurfaceAtlas(meta,asBuffer(raw),asBuffer(skin));
const points=JSON.parse(fs.readFileSync('tests/fixtures/full-lower-limb-surface.json'));
for(const r of points){
 const [x,y,z]=r.point,hit=localizeFace(meta,atlas,r.face,{x,y,z});
 assert.equal(hit?.regionId,r.expected_region,r.name);assert.equal(hit?.areaId,r.expected_area,r.name);
}
for(const path of ['/','/src/App.tsx','/src/AnatomyStage.tsx'])await get(path);
const checks=[];
for(const id of ['LOC-TOE-HALLUX','LOC-TOE-LESSER']){
 const result=await fetch(`${base}/api/resolve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({localization_area_id:id})});
 assert.equal(result.status,200);const body=await result.json();assert.equal(body.localization_area.area_id,id);
 assert.ok(body.dimensions.flatMap(d=>d.groups).flatMap(g=>g.items).length);
 checks.push(id);
}
for(const id of ['AF-R-011','AF-R-012']){
 const r=await fetch(`${base}/api/resolve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({region_id:id})});
 assert.equal(r.status,200);assert.equal((await r.json()).localization_area.area_id,`LOC-${id}`);checks.push(id);
}
const report={served_atlas_matches_file:true,fixed_surface_points:points.length,api_entries:checks,source_modules_load:true};
fs.writeFileSync('build/authoring/full-surface-http-verification.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
