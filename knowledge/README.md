# 内容资料目录

当前运行数据由两个工作簿生成：

- `RehabMind_KnowledgeDB_v3.8.xlsx`：区域、评估项目、发现、关系、条件等现行核心结构。
- `RehabMind_ClinicalExtension_v1.1.xlsx`：方向说明、临床目的、表现、处理参考、问诊思路及定位内容指南。`npm run data` 读取这两个文件生成运行数据。新增内容保留“待临床审核”标记；来源链接需结合条目的适用范围阅读。

扩展表以 `Item_ID`、`Assessment_Map_ID` 和 `Feature_ID` 与核心库关联。改稿应直接编辑扩展工作簿，之后运行 `npm run data` 和 `npm test` 检查关联。

`review/` 保存内容修改规范、来源核对、变更日志及验证结果。`region_calibration_v1.json` 是2026-10-02区域校准的三批修改规范，重建时在历史整改之后应用。`region_anatomy_coverage_v1.json` 记录下肢组织覆盖与模型缺项。

v3.4、v3.7基线及v1.0草稿为历史文件。`library/drafts/` 的资料库草稿尚未接入运行页面；髋部尚无现行独立 Region 与定位映射。
