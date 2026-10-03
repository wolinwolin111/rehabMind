# 问诊与下肢肌肉图谱审核 · 2026-10-03

## 本轮完成

- 对原 101 条问诊逐条走读，57 条修改、44 条保留。新增 28 条：2 条共同问诊、18 条细分问诊、8 条旧区域入口回退问诊。实际共 129 条，并非全部堆在一个入口。
- 疼痛性质先开放描述，再给必要追问；不把某一描述直接推断为特定组织病变。
- 新增活动诱发阈值、缓解时间、次日反应，帮助选择本次检查负荷。
- 保留“目标活动 → 所需能力 → 当前差距 → 训练安排”的恢复目标说明。
- 鹅足、髌腱、髂胫束、腓骨头、缝匠肌及足趾增加针对性问题；膝后/小腿边界和缝匠肌重叠区域替换较泛的问题。
- 补腓肠肌内、外侧头入口的问诊，以及胫骨内侧、深后侧旧区域入口。38 个区域、56 个细分入口均已做解析覆盖检查。
- 问诊保持 Display_Only，不收集答案，不触发诊断或自动处理。新增内容不改变评估项目、处置关联或圈选定位。
- 图谱新增 59 个下肢肌肉/肌头名称的起止点及主要功能，左右合计 118 个模型部件；分清股二头肌长短头、腓肠肌内外侧头、足小肌肉与同名手肌。

肌肉说明是常见解剖文字，不是模型表面的起止点坐标。髋周肌肉作为下肢图谱收录，不代表新增髋部康复思路模块。足小趾对掌肌等变异结构单独注明限制。

## 特殊测试：建议按需补充，不逐组织机械铺开

现有数据库并非完全没有：包括踝前抽屉、距骨倾斜、下胫腓联合测试组、Windlass、神经及运动诱发问题筛查。多数按症状条件关联显示，因此打开局部组织页时不一定可见；膝部当前“机械表现检查”也不能代替韧带与半月板的专项辨别内容。

建议局部组织条目内提供“何时进一步辨别”的说明，并链接相关专项检查。每项需明确：适用病史、体位与操作要点、观察熟悉疼痛/松弛/终末感/侧差、结果局限、何时停止。专项检查保留同一份数据，避免在每块组织重复维护。

优先后续内容：膝韧带稳定检查、半月板相关检查组合、跟腱完整性；足底与踝现有专项应补可见入口与适用说明。鹅足和髂胫束等不应为了凑齐栏目添加所谓“一项确诊测试”。急性骨折、感染、血管等疑虑先分流，不能靠反复诱发测试排除。

本轮完成了特殊测试库存与显示路径审核，未新增或放开整套专项测试。测试操作和适应证应作为独立内容批次逐项审订。

## 依据与边界

- IASP：Identifying Neuropathic Pain in the Clinic（2026），以及 NeuPSIG 2016 分级；疼痛描述需结合病史、合理分布及检查。
  https://www.iasp-pain.org/resources/fact-sheets/identifying-neuropathic-pain-in-the-clinic-a-guide-for-clinicians/
- NICE NG193：以人为中心了解症状、影响与目标；不将慢性原发痛治疗建议外推到全部下肢问题。
  https://www.nice.org.uk/guidance/ng193/chapter/recommendations
- AAOS：鹅足、跟腱断裂、Lisfranc 损伤的病史和分流要点。
  https://www.orthoinfo.org/diseases--conditions/pes-anserine-knee-tendon-bursitis
  https://www.orthoinfo.org/diseases--conditions/achilles-tendon-rupture-tear/
  https://www.orthoinfo.org/diseases--conditions/lisfranc-midfoot-injury
- UAMS 与 Texas Tech 解剖教学表：常见下肢肌肉附着与作用；中文为摘要整理，未照搬整表。
  https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-lower-limb/
  https://anatomy.ttuhscep.edu/schemes/leg_tables.html
- 原有地方记录、书籍引用保留，本轮未重新审阅所有实体书照片或修改其治疗方法。审核为辅助内容审核，未把工作簿的“待临床审核”冒充更改成“已临床审核”。

## 可追溯文件

- `knowledge/review/consultation_review_v1.json`：最终修改方案。
- `consultation_review_disposition.json`：原 101 条逐项处理记录。
- `consultation_review_changes.json`：单元格修改前后内容。
- `consultation_workbook_verification.json`：保存后读回及无关表/原样式保护结果。
- 修改被挂到历史数据库重建流程的末尾，防止重建覆盖；运行时由 Excel 重新生成。
