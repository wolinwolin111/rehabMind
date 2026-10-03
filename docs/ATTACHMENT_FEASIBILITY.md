# 肌肉附着结构：本地可行性试验

日期：2026-10-03。完整发现见 [实际模型核查结果](./MUSCLE_MODEL_FINDINGS.md)。

## 本地查看

运行 `node scripts/run-python.mjs scripts/attachment_trial.py`，Vite 运行时打开 `http://localhost:5173/design-preview/attachments/index.html`。

- 小腿三头肌：左图为旧显示方式，右图恢复原始跟腱；同步相机，可点选。
- 股直肌：两图均为原始网格，右图可记录髋骨候选附着位置。导出带骨骼 ID、面编号、坐标及 draft_requires_anatomical_review 状态，尚未重建近端肌腱。
- 大小菱形肌：分别显示原始网格与骨骼，保留标准解剖说明。
- 共加载 38 个未变形的源部件；全量核查另见 audit.html。
- 大小菱形肌经用户复核连接正确，保留原始模型；已撤下校准草稿与修模提示。

## 已进入本地产品的修正

左右跟腱 FJ1405 / FJ1405M 已独立导出至 tendons.pack，保留源几何、身份及共同肌肉关系。随同侧腓肠肌两头、比目鱼肌显示，支持点选和单独显示；分层后不再有相关肌肉时隐藏并清除选择。

指浅屈肌、尺侧腕伸肌的同侧多片源网格已组合用于高亮和单独显示。拇短屈肌左右显示标签校正，源编号与 FMA 编号保留。既有骨骼、肌肉和皮肤的顶点及原打包面索引没有因此移动或重排；区域定位与康复思路数据库未改。

scripts/prepare_3d.py 已接入独立肌腱打包，后续完整构建会生成对应资源。

后续本批：新增左右髂胫束、胫腓骨间膜、前臂骨间膜、足底长韧带，共8个原始部件。与原左右跟腱合计10个连接组织，可点选、单独显示、关联肌肉显示并查看说明。髂胫束从骨骼绘制中去重但源包不变。详见 [连接组织恢复](./CONNECTIVE_MODEL_RECOVERY.md)。股直肌近端新增放大入口，仍不把候选骨面标记当作真实足印。

## 未完成项

股直肌直头、反折头未提供独立源部件与足印标记。此前最近骨面的补段位置被用户指出错误，已撤回。现按用户本模型圈点重新记录右侧髂前下棘与髋臼上缘，左侧采用对应骨面候选，替换选中视图的偏高近端，保留下方肌腹及远端，并支持原图对比；这不代表真实腱束或完整足印重建，详见 [股直肌连接示意](./RECTUS_PROXIMAL_SCHEMATIC.md)。肱二头肌短头、尺侧腕屈肌尺骨头现已补充同侧源网格中的末端片段用于单独显示，仍未精细标出腱束边界。

原资源没有背阔肌、腹直肌、腹横肌、腹内斜肌、腰方肌、多裂肌等具名网格；文字资料不能替代缺失模型。

## 验证方式

源几何／身份完整性、左右实际射线点选、组合后远端指部可达性、共同肌腱的侧别／分层／单独显示规则及 TypeScript 编译。

```powershell
node --test tests/attachment-trial.test.mjs tests/muscle-selection.test.mjs tests/tendon-anatomy.test.mjs tests/muscle-picking.test.mjs tests/muscle-layers.test.mjs tests/atlas-interaction.test.mjs tests/muscle-anatomy.test.mjs
npx tsc --noEmit
```

工程测试不属于解剖足印认证。全量 349 个源网格的双视角外形粗核记录绑定几何哈希，边界见完整结果。修改仅在本地，未推送、未部署、未打包 APK。
