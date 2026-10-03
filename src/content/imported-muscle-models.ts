import {muscleKey} from './muscle-anatomy';
const names=new Set(['latissimus dorsi','rectus abdominis','internal oblique','transversus abdominis','quadratus lumborum',
 'multifidus cervicis','multifidus thoracis','multifidus lumborum','extensor digitorum brevis',
 ...['first','second','third','fourth'].map(n=>`${n} dorsal interosseous of foot`),
 'linea alba',...['anterior','middle','posterior'].map(n=>`${n} layer of thoracolumbar fascia`)]);
export function importedMuscleModel(name?:string){
 if(!name||!names.has(muscleKey(name)))return null;
 return {url:'https://github.com/LluisV/Z-Anatomy-Sample',license:'CC BY-SA 4.0',
  note:muscleKey(name)==='multifidus lumborum'?'已配准至本模型骨架；来源缺少的骶骨端补有教学肌束，原有腰椎附着保留。':
   muscleKey(name)==='internal oblique'?'本模型肋部覆盖第10–12肋；《基础肌动学》描述第9–12肋，大学解剖资料也有下3或4肋的范围。本模型未表达第9肋连接。腹壁腱膜保留在同一网格，另有腹白线及相关胸腰筋膜可查看。':
   muscleKey(name)==='transversus abdominis'?'已配准并核查附着区域。腹壁腱膜与肌肉主体在来源中属于同一网格，未作为独立肌腱拆开；另有腹白线和相关胸腰筋膜可查看。':'已配准至本模型骨架并核查附着区域。',
  limitation:'配准后的几何供解剖观察，未验证个体肌腱足印。'};
}
