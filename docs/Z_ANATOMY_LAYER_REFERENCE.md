# Z-Anatomy 肌肉分层参考

参考 Z-Anatomy 官方 Unity 项目 PC-Version 的 [原始分层表](https://github.com/LluisV/Z-Anatomy/tree/PC-Version/Z-Anatomy%20PC/Assets/Models/Layers/Muscles) 和 [显示逻辑](https://github.com/LluisV/Z-Anatomy/blob/PC-Version/Z-Anatomy%20PC/Assets/Scripts/Management/Layers.cs)，读取日期 2026-10-03。

官方数组按 Muscles-1 到 Muscles-10 加入显示。1 为最深，9 为表面肌肉；10 为滑囊、腱鞘等辅助组织。用户明确需要类似 3DBody 的覆盖肌群剥离效果，取消直接采用这套九级编号的实现。产品一次操作去掉全身各区域当前的覆盖肌群，最多四次减层，可一直去除到骨架。此文件是研究记录。

原始九个列表、别名映射、来源级别与许可保存在 `docs/reference/z-anatomy-layers.json`，不导入产品运行代码。185 种可点击常用肌肉名称中180种匹配官方名称（含集合／分段名称映射），5种在该版本表中没有独立条目，单列人工依据：头半棘肌、腰椎内侧横突间肌、颈椎前／后横突间肌群、耻骨直肠肌。人工条目没有虚构官方级别。

研究映射对原表左右不一致条目采用较表浅级别；这一归并不作为产品的肌肉层次判断。产品按局部解剖覆盖顺序：腹壁去腹外斜肌／腹直肌后露腹内斜肌，再露腹横肌；背部去斜方肌／背阔肌，再去菱形肌和后锯肌等覆盖层，露出竖脊肌，再露出深层节段肌。取消此前“各局部始终保留最深一组”的限制：第三次减层去掉腹横肌并保留后腹壁的腰方肌、腰大肌和髂肌，大腿三次后清空；第四次去掉后腹壁与足部等最深层。最后一步所有可点击肌肉均不显示，加层后恢复原始网格。现有区域定位与康复数据库不依赖显示级别。

原模型和本地已通过的附着修正保持原样；这里只改变可见性和显示索引。腹壁、背部穿插修正继续根据当前覆盖肌是否可见生效。

出处与许可：Z-Anatomy — Gauthier Kervyn、Marcin Zielinski、Lluis Vinent；CC BY-SA 4.0。源分层表保留署名和相同许可。
