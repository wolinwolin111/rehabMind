# 原资源连接组织恢复

2026-10-03，本地修改。未推送、未部署、未打包 APK。

## 本批

| 结构 | 原资源 ID（右／左） | 身份与关联 |
|---|---|---|
| 髂胫束 | FJ1423 / FJ1423M | 筋膜；阔筋膜张肌与臀大肌部分纤维的连接 |
| 胫腓骨间膜 | FJ1392 / FJ1392M | 纤维膜；相关小腿肌肉的部分起始区域 |
| 前臂骨间膜 | FJ1476 / FJ1476M | 纤维膜；相关深屈肌、拇指和示指深伸肌的部分起始区域 |
| 足底长韧带 | FJ1424 / FJ1424M | 韧带；足底方肌部分近端连接及足弓关系 |

另保留先前恢复的左右跟腱，共10个源部件。每块均保留原顶点、法线、三角面、FMA编号及几何哈希，不生成新组织。

## 产品行为

- 肌肉图谱中可点选、单独显示，或从“查看连接组织”直接选择深层结构。
- 单独显示相关肌肉时，带上同侧关联结构；分层后根据剩余肌肉关系显隐。主动单独选择连接组织时可独立观察。
- 不把筋膜、骨间膜、韧带称为肌肉或全部称为肌腱；说明分为组织关联、主要连接和作用。
- 原资源把髂胫束归入骨骼层。源骨骼包不变，运行时去掉重复的髂胫束绘制，重新映射骨骼射线面编号；单独骨骼仍使用原索引和源身份。
- 核查页可直接选择以上结构，并查看相关肌肉与其连接组织。股直肌新增近端放大，以便检查原始近端形态。

## 资料与边界

- [Elsevier 髂胫束](https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-lower-limb/iliotibial-tract/17689)：阔筋膜增厚、髂嵴和胫骨连接、相关肌肉。
- [Elsevier 足底长韧带](https://www.elsevier.com/resources/anatomy/connective-tissue/connective-tissue-of-lower-limb/long-plantar-ligament/20688)：跟骨、骰骨及跖骨连接，与腓骨长肌腱通道的关系。
- [Texas Tech 小腿与足表](https://anatomy.ttuhscep.edu/schemes/leg_tables.html)：相关肌肉的骨间膜起点、足底方肌和足底长韧带关系。
- [Texas Tech 前臂表](https://anatomy.ttuhscep.edu/schemes/forearm_tables.html)：相关深层肌肉的骨间膜起点。

显示整张膜或筋膜不代表已标出每块肌肉的精细附着足印。股直肌直头／反折头、共享腱束与集合网格的逐束附着仍未认证。保留当前接缝显示版本，不进行缺少解剖依据的精细腱束重建。

## 最小充分验证

源字节比对包含顶点、法线与三角面；同侧关联、分层及单独选择的显隐；每个组织的实际 BVH 射线可达；骨骼去重后的面编号与源三角面映射；先前补段接缝和组合肌肉回归。27项相关测试通过，TypeScript检查通过。

```powershell
node scripts/run-python.mjs scripts/tendon_index.py
node --test tests/attachment-trial.test.mjs tests/muscle-selection.test.mjs tests/tendon-anatomy.test.mjs tests/muscle-picking.test.mjs tests/muscle-layers.test.mjs tests/atlas-interaction.test.mjs tests/muscle-anatomy.test.mjs
npx tsc --noEmit
```

后续完整构建的 `prepare_3d.py` 会重新生成这些源资源；不依赖手工修改的本地包。
