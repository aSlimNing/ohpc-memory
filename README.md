# 鸿蒙 PC 开发实战基准与现场知识库

在一台**鸿蒙 PC** 上用真实工程把主流开发场景逐个跑通或撞墙之后留下的产物：一份基准报告、一张平台作战地图、一本坑账本，和一套按场景组织的知识库。

八个主流场景——前端构建、免构建静态站点、Node/Python/Java 服务、C/C++ 原生编译、数据层，以及鸿蒙 HAP 编译签名与真机部署——都在这台机器上端到端跑通了。

这里不是教程，也不是"鸿蒙到底能不能开发"的泛泛之谈：每条结论都带实测日期、原始命令和证据路径。

## 目录导览

| 想了解什么 | 看哪里 |
|---|---|
| 整体结论与证据 | `dev-top8-lab/BENCH.md` |
| 平台策略与生态现状 | `dev-top8-lab/HARMONYOS-PC-DEV-MAP.md` |
| 某件事**能不能做** | `dev-top8-lab/HARMONYOS-PC-ISSUES.md`（坑账本） |
| 某件事**怎么做成** | `dev-top8-lab/harmonyos-knowledge/`（知识库本体） |
| 真实工程长什么样 | `dev-top8-lab/02-static/` … `07-redis/`、`frontend-toolchain-lab/`、`java-probe/` 等实验目录 |

知识库分两层：`platform-and-toolchain.md` 讲语言无关的平台约束，`scenario-javascript/java/c.md` 按语言分线，`scenario-recipes.md` 收跨语言场景。每条都给出首选路径、失败判据和备选绕法。

坑账本是全库唯一允许写"负面结论"的地方：每条有固定 id、状态（`阻塞` / `可绕开` / `待验证` / `已解决`）、解除条件和复测触发点。`待验证` 不代表"有问题"，只代表没证据——不拿嗅探和推断冒充结论。

## 怎么用

- 先查账本判断**能不能做**，再查知识库看**怎么做**
- 想复核就自己跑一遍：条目里带原始命令和证据路径
- 改完知识库，跑 `node dev-top8-lab/harmonyos-knowledge/validate.cjs`

## 快照与时效

内容对应 **HarmonyOS PC / HongMeng Kernel 1.13.0、aarch64 / musl（无 glibc）、OHOS SDK 26.0.0.18（API 26）**，实测于 2026-09-28 ~ 09-30。

这是**被测那台机器**的状态，不是通用事实；结论保鲜期很短，换设备或系统升级后请重新探测——知识库每条都标了 `measured_on` 与 `invalidate_when`，账本每条都有复测触发点。

仓库内不含任何私钥、证书、口令或 profile 内容。知识库正文是英文，报告与账本是中文。

---

## English

A field record of running mainstream development workflows on a real **HarmonyOS PC** (HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26), measured 2026-09-28 → 09-30: a benchmark, a platform/ecosystem map, a pit ledger, and a scenario-organized knowledge base.

The knowledge base (`dev-top8-lab/harmonyos-knowledge/`) holds what *works* — a preferred path, a failure criterion and a time-bounded fallback per item. The ledger (`dev-top8-lab/HARMONYOS-PC-ISSUES.md`) holds what *doesn't*, and is the only place a negative statement is allowed to live, never without a status and a release condition.
