# 缺失肌肉与连接组织：本地接入及核查

日期：2026-10-03。补充资产已接入肌肉图谱；原有肌肉顶点、三角面和已通过的股直肌近端修正保留。

## 本轮完成

| 结构 | 左右模型数量 | 附着／连接处理 |
|---|---:|---|
| 背阔肌 | 2 | 骨盆、肩胛及肱骨端同骨架配准，关联胸腰筋膜后层；源网格已含肱骨端，不另造重复肌腱 |
| 腹直肌 | 2 | 耻骨至剑突、第5–7肋软骨区域核查；腹白线单独保留 |
| 腹内斜肌、腹横肌 | 4 | 宽面骨盆、肋部附着及腹壁腱膜随整体网格配准；关联腹白线与胸腰筋膜 |
| 腰方肌 | 2 | 髂嵴、第12肋、腰椎横突区域核查；关联前、中层筋膜 |
| 多裂肌（颈、胸、腰段） | 6 | 分段保留，腰段来源骶骨端有缺口，增加短段教学肌束，原有腰椎附着不被拉走 |
| 趾短伸肌 | 2 | 保留第2–4趾三条远端腱样分支，与已有拇短伸肌分开 |
| 第1–4足背骨间肌 | 8 | 来源集合按连通分量拆分；逐块核对邻近跖骨与趾侧别 |
| 胸腰筋膜后、中、前层 | 6 | 三层分别配准、可点选；中层内侧边界向实际腰椎横突尖转移，保留宽面结构 |
| 腹白线 | 1 | 剑突至耻骨附近，中线共享，左右腹肌均可关联查看 |

共新增13种肌肉、26个左右模型，以及7个连接组织模型。当前常用运动肌肉图谱共185种名称、375个可点选网格。肌肉有起点、止点和功能；连接组织有组织关联、主要附着／延续和功能、依据及模型说明。

膝关节肌：本次可靠来源只有骨面起点标记，未发现独立肌肉网格，仍保留文字资料。

## 腱膜、肌腱是否需要另补

- 腹内斜肌／腹横肌来源把肌腹与腱膜合在一张网格内，保留连续形态。腹白线不是腹直肌肌腱，也不能代替完整腹直肌鞘。没有可靠独立几何的腹直肌鞘、联合腱、腹股沟韧带未伪造为细绳。
- 背阔肌源网格已到达肱骨端；本轮附着区域检测支持保留其既有末端。其腰背部筋膜连接则用独立后层查看。
- 腰方肌保留来源的横突连接区域。解剖资料的腱性连接不等于已有逐束的独立腱模型；本轮未宣称把每条腱束重建出来。
- 趾短伸肌和足背骨间肌保留远端连续几何。足背腱帽没有独立可靠网格，本轮不把一块新的肌肉标签冒充完整伸肌装置。
- 原有跟腱、髂胫束、骨间膜、足底长韧带保留。关联选择会显示相关连接组织；筋膜仍独立于肌肉命名。

## 解剖依据

主参考为本地《基础肌动学》第3版；新增肌肉在网页参考资料及 `MUSCLE_TEXT_REVIEW.md` 中保留书页。没有独立条目的内容用大学解剖资料及解剖研究补充。

- [UAMS 背部肌肉](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-back-region/)
- [UAMS 腹部肌肉](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-abdominal-region/)
- [UAMS 下肢肌肉](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-lower-limb/)
- [UAMS 腹部表面／筋膜解剖](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/topographical-anatomy-tables/topographical-anatomy-of-the-abdomen/)
- Barker等，2007：[腰筋膜中层及腰椎横突附着解剖研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC2140134/)
- Schuenke等，2012：[胸腰筋膜外侧缝与腰筋膜间三角解剖研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC3512280/)

腹内斜肌的肋部覆盖存在资料范围差异：《基础肌动学》第217页写第9–12肋；UAMS/TTUHSC表述为下3或4肋；来源模型表达第10–12肋。第9肋连接未在模型中表达，仍保留书籍描述，并在文案及检测报告中明确标出，未将约32 mm的间隔算成附着通过。

## 来源、配准与检查

来源为 [Z-Anatomy-Sample 官方仓库](https://github.com/LluisV/Z-Anatomy-Sample)，CC BY-SA 4.0；署名、来源文件Git blob及修改方式在 `assets/anatomy-supplements/ATTRIBUTION.md`。模型压缩资产直接参与构建，无需构建时联网下载FBX。

1. 源骨架与当前骨架按100个同名骨结构对应。骨盆、肋软骨、各椎骨及足骨分别做刚体表面拟合，再生成平滑空间位移场。不能把源FBX缩放一下就当成配准完成。
2. 用源模型真实接近对应骨面的肌肉顶点区域检查配准后位置，保留同一批源顶点身份；不改成“任意最近一点”掩盖大范围附着偏移。
3. 当前26个肌肉模型中，来源已表达的上述附着区域检测，各区域距离P95最大2.988 mm（有限邻近骨三角面得到的保守距离估计）。这是几何接近程度，不是解剖标志定位误差或临床精度证明。
4. 12160个源顶点位置抽样检测配准位移场Jacobian，20个来源网格均未发现非正行列式；只是抽样检查，不能证明全表面无自交。最终网格同时核对三角面面积变化、有限坐标、两侧方向、双视角外形及射线点选。
5. 胸腰筋膜是低细分宽面网格；源边界点与各椎骨的最近距离仍有毫米级差异，报告保留数值，不声称每一节段筋膜／韧带已精确贴合。前层命名与归属存在资料差异，网页有说明。
6. 报告 `MISSING_MUSCLE_ATTACHMENT_REVIEW.json` 绑定实际资产SHA256；41项针对性测试通过，覆盖新增点选、单独显示、分层、左右、连接组织关系、原网格保留及股直肌回归。TypeScript检查和生产构建通过。

## 复现

下载官方肌肉及骨架FBX至 `build/`，依次运行：

```
node scripts/authoring/extract_z_anatomy.mjs
py -3 scripts/authoring/register_missing_muscles.py
py -3 scripts/authoring/check_registration_field.py
py -3 scripts/authoring/review_missing_muscles.py
py -3 scripts/prepare_3d.py
```

`render_missing_muscles.py` 输出双视角静态图；本地核查页面 `design-preview/attachments/audit.html` 支持按新增ZA部件筛选。

## 表达范围

这些是依据解剖附着区域适配到当前骨架的教学模型，尚未验证个体肌腱足印、组织厚度和真实纤维束。原有肌理增强也是显示材质，不是专用纤维方向数据。新增网格不会改变既有临床区域定位与康复数据库查询。
