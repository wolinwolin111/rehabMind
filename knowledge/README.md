# 内容资料目录

当前运行数据由两个工作簿生成：

- `../baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/02_Database/RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx`：区域、评估项目、发现、关系、条件等核心结构，保持只读。
- `RehabMind_ClinicalExtension_v1.0_Draft.xlsx`：整改方案新增的方向简述、临床目的、具体表现、解释和处理参考。`npm run data` 会读入此文件生成本地预览。每条新增内容标记“待临床审核”；来源链接是相关临床资料，不能代表每句话均获原文逐条支持。

扩展表以 `Item_ID`、`Assessment_Map_ID` 和 `Feature_ID` 与核心库关联。改稿应直接编辑扩展工作簿，之后运行 `npm run data` 和 `npm test` 检查关联。

`RehabMind_LowerLimb_KnowledgeDB_v3.4.xlsx`、`review/` 与 `library/drafts/` 是历史审计或未审核资料库草稿。资料库内容尚未接入运行页面；髋部尚无现行 Region 与定位映射，需另行扩展核心库。
