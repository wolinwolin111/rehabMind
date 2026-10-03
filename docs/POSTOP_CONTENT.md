# 术后康复资料接入

2026-10-02，从 `66.154.101.204:/opt/rehabguide/products` 导入 shop 中已发布的下肢术后相关完整资料。

## 接入范围

- ACL 重建术后
- 半月板术后
- ACL + 半月板联合术后
- PCL 损伤与重建术后
- 髌骨脱位与 MPFL 重建术后
- 跟腱损伤与断裂术后

混合保守与术后路径的文件保留全部原文，列表使用原目录的适用范围标签。未发布的踝扭伤、肌肉拉伤，以及腰椎资料未接入。

## 文件组织

- `public/postop/guides/`：完整 HTML 与实际引用的配图/共享样式，保持源文件字节一致。
- `src/content/postop-catalog.json`：仅阅读所需的标题、部位、适用范围、简介、章节和文件路径。
- `src/PostoperativeLibrary.tsx`：分类、标题/章节搜索、全文阅读与返回。
- `docs/POSTOP_IMPORT_MANIFEST.json`：来源、导入时间、文件大小和 SHA-256。
- `scripts/authoring/import_shop_guides.mjs`：导入脚本，输入为已获取的 products 目录。

资料采用本地文件读取，不依赖 shop 登录或服务器在线状态。原文的阶段折叠、解剖图和文献链接保留。初次迁入曾使用隔离 iframe；现在主阅读页已改为原生专业阅读版，详见 [专业阅读版说明](POSTOP_PROFESSIONAL_EDITION.md)。没有导入账户、订单、收费字段，没有更新核心评估数据库。

本地验证：类型检查、前端构建、目录与文件完整性测试。当前未发布到 VPS。

## 本次配色

应用参考页方案 2 最终值：柔和蓝 `#ACCDE3`、蜜瓜绿 `#D4EFB5`、杏桃 `#FFD5AD`、奶油白 `#FFF8E9`、选中蓝 `#397EAF`。评估卡片为蓝色标题与白色展开正文，处理参考为杏桃色标题与白色正文；模型背景改为接近白色的 `#FFFDF7`。
