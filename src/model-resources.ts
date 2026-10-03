const modelAsset=(file:string)=>`${import.meta.env.BASE_URL}3d/${file}?v=${import.meta.env.VITE_MODEL_ASSET_REVISION}`;
// Reopening the atlas reuses immutable decoded data, rather than inflating it again.
const buffers=new Map<string,Promise<ArrayBuffer>>();
let metadata:Promise<unknown>|undefined;
export function modelBuffer(file:string,compressed=true) {
  let pending=buffers.get(file);
  if(!pending){
    pending=fetch(modelAsset(file)).then(async response=>{
      if(!response.ok)throw new Error(`模型资源加载失败：${file}`);
      if(!compressed)return response.arrayBuffer();
      if(!('DecompressionStream' in globalThis))throw new Error('当前浏览器不支持模型解压，请更新浏览器');
      return new Response(response.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }).catch(error=>{buffers.delete(file);throw error;});
    buffers.set(file,pending);
    // Keep the initial atlas view and one other layer. Avoid retaining every
    // expanded display pack in a phone's memory after a full dissection.
    if(file.startsWith('atlas-muscles-')){
      for(const old of buffers.keys())if(old.startsWith('atlas-muscles-')&&old!=='atlas-muscles-0.pack'&&old!==file)buffers.delete(old);
    }
  }
  return pending;
}
export function modelMetadata<T>() {
  metadata??=fetch(modelAsset('skin.json')).then(response=>{
    if(!response.ok)throw new Error('模型索引加载失败');
    return response.json();
  }).catch(error=>{metadata=undefined;throw error;});
  return metadata as Promise<T>;
}
import {decodePreparedModel,decodePreparedPool,preparedPoolFiles} from './prepared-model';
export async function preparedModel(file:string){
  const buffer=await modelBuffer(file);
  const pools=await Promise.all(preparedPoolFiles(buffer).map(async name=>decodePreparedPool(await modelBuffer(name))));
  return decodePreparedModel(buffer,pools);
}
