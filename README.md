# RehabMind V2

面向有基础的康复师的手机优先康复思路助手。当前运行 **DB v3.8** 和独立临床扩展v1.1，原始v3.7资产包保留。覆盖膝、踝足、小腿、大腿38个定位区域，临床内容待用户审核。网页可运行；APK打包暂缓。

## 权威资产

- 运行数据库：`knowledge/RehabMind_KnowledgeDB_v3.8.xlsx`
- 原始数据库：`baseline/RehabMind_LowerLimbV1_ImplementationBaseline_DBv3.7_2026-09-29/02_Database/RehabMind_LowerLimb_KnowledgeDB_v3.7_Final.xlsx`
- 整改方案：`docs/康复思路数据库与产品整改方案_v1.0.docx`
- 临床扩展：`knowledge/RehabMind_ClinicalExtension_v1.1.xlsx`
- 产品设计：同一资产包的 `01_Design/RehabMind_LowerLimbV1_DesignSpec_DBv3.7.docx`
- 详细实施要求：同一资产包的 `01_Design/RehabMind_LowerLimbV1_ExecutableImplementationPlan_DBv3.7.docx`
- `03_UI_Reference/` 只作视觉与交互参考；`04_3D_Localization/` 提供模型和定位合同。旧 v3.4 文件只作历史核对，不进入运行时。

## 目录

| 目录 | 用途 |
| --- | --- |
| `baseline/` | 原始资产包，保持只读；`archive/` 保存 ZIP |
| `scripts/` | 生成运行数据和3D资源；`authoring/` 保存内容维护及审计脚本 |
| `build/knowledge/`、`build/web/` | 自动生成的数据和网页产物 |
| `api/` | HTTP 接口与薄 Resolver |
| `src/` | 网页与 Android 共用界面、模型定位 |
| `public/3d/` | 自动生成的模型资源 |
| `android/` | Capacitor Android 工程，暂不打包 APK |
| `knowledge/` | 临床扩展草稿、旧版审计和资料库草稿；扩展工作簿参与本地预览 |
| `docs/`、`tests/` | 项目说明与回归检查 |
| `deploy/` | VPS 部署文件，尚未部署 |

## 本地运行

需要 Node.js 22.12 或更新版本，以及 Python 3。首次安装依赖：

```sh
npm ci
python -m pip install -r scripts/requirements.txt
```

Linux 可使用 `python3 -m pip install -r scripts/requirements.txt`；也可用 `REHABMIND_PYTHON` 指定已安装 `openpyxl` 的虚拟环境 Python 路径。先运行 `npm run data`，然后分别在两个终端启动：

```powershell
npm run api
npm run dev
```

打开 [http://localhost:5173/](http://localhost:5173/)。`npm run dev`先生成当前数据库运行快照及3D资源。`npm test`运行数据与Resolver回归；`npm run build`生成网页版。

界面从完整人体模型点选、划线或圈选进入相应部位；默认显示骨骼、隐藏肌肉，皮肤不透明度10%。评估方向分标签，项目按组列出并逐层展开，发现详情单独打开。全部下肢区域都有周围组织说明和问诊思路，处理参考按具体表现关联方法。风险情况独立显示并隐藏普通处理参考。系统不自动生成诊断或方案。模型定位仍有待校准问题，临床文案待用户审核。

当前开发状态、已验证范围和待办见 [实施状态](docs/IMPLEMENTATION_PLAN.md)。

## 保存与构建

```sh
git clone https://github.com/wolinwolin111/rehabMind.git
cd rehabMind
npm ci
python3 -m pip install -r scripts/requirements.txt
npm test
npm run build
```

正式数据库、v3.7原始模型资源和开发文档纳入版本管理。`build/`、`public/3d/` 为可重新生成的产物；`npm test` 会生成数据、模型和当前内容审计后运行回归，`npm run build` 生成 `build/web/`。原始记录的私有索引、缓存和重复资产ZIP保留在本地。

内容维护脚本在 `scripts/authoring/`，平常运行和构建无需表格编写工具。历史迁移、工作簿编辑等维护操作另需 `@oai/artifact-tool` 及相应本地参考资料。当前网页版稳定基线保存在 Git，VPS 部署目标为 `66.154.101.204`，服务器尚未部署本项目。
