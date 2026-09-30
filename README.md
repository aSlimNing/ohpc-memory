# 鸿蒙 PC 开发实战基准与现场知识库

在一台**鸿蒙 PC** 上用真实工程把主流开发场景逐个跑通或撞墙之后留下的产物：一份基准报告、一张平台作战地图、一本坑账本，和一套按场景组织的知识库。

不是教程，不是榜单，也不是"鸿蒙到底能不能开发"的泛泛之谈——这里每条结论都带实测日期、原始命令和证据路径。

## 快照环境

| 维度 | 实况 |
|---|---|
| 系统 | HarmonyOS PC / HongMeng Kernel 1.13.0 |
| 架构 / libc | aarch64 / **musl**（没有 glibc） |
| SDK | OHOS SDK 26.0.0.18（API 26），以 HNP 形式提供且只读 |
| 实测窗口 | 2026-09-28 ~ 2026-09-30 |

这些是**被测那台机器**的状态，不是通用事实。换设备或系统升级后请重新探测——知识库里每条都标了 `measured_on` 和 `invalidate_when`。

## 结论速览

**Top8 场景 8/8 通过**（2026-09-29）：

| # | 场景 | 结果 |
|---|---|---|
| 1 | 鸿蒙 HAP 编译 + 签名 | ✅ |
| 2 | ArkTS 应用运行与调试 | ✅ 真机闭环（编译→签名→无线装机→启动→截屏取证） |
| 3 | Java 后端服务 | ✅ 需经 HarmonyBrew 渠道 |
| 4 | 前端 SPA 工程化（Vite / 纯 JS 两条路） | ✅ Vite 需本地编 esbuild |
| 5 | 免构建静态站点 + 本地预览 | ✅ |
| 6 | Node.js HTTP API 服务 | ✅ |
| 7 | Python Web 服务 + pip 依赖 | ✅ |
| 8 | C/C++ 原生编译（clang/CMake/Ninja） | ✅ |
| — | Git、Redis、SQLite（贯穿各场景） | ✅ |

三条一开始被判"不可用"、后来靠穷举渠道翻盘的：**Java**（HarmonyBrew 毕昇 JDK）、**前端 native 链**（本地编 esbuild）、**官方 Node 运行时**（gitcode `DevNode-OH` 的 HNP 包 + 签名门）。翻盘过程记在坑账本里，因为"判死的姿势错了"本身就是可复用的教训。

## 平台上的四条硬规矩

理解这四条，就理解了 80% 的"为什么不行"：

**① 沙箱隔离，工具链零共享。** 应用各自有私有沙箱；DevEco Studio 本体在 HAP 沙箱内，外部 CLI 探测不到。

**② 二进制执行门禁分两关。** `section header` 不规范（Go/Rust 预编译包常见）**不可自救**，只能本地重编译；`.codesign` 缺失或非法则**可以自签放行**——但段必须 **4096 对齐**，否则等同没签。标签、`chmod`、硬链接都不是判据。

**③ 包管理三层，缺工具按顺序找。** 系统级 HNP（`/data/service/hnp`，装完即在 PATH）→ 用户级 HarmonyBrew（`~/.harmonybrew`）→ 语言级 npm/pip（原生依赖会踩门禁②）→ 官方生态入口 gitcode `OpenHarmonyPCDeveloper`。

**④ 部署签名门禁。** 零售机只认华为签发证书 + 按 `bundleName` 绑定的 profile。实测三档错误码：`9568257`（证书链不对）、`9568329`（bundleName 与 profile 不符）、`9568393`（漏 `-signCode 1`）。

## 仓库结构

```
dev-top8-lab/                    主实验场
  BENCH.md                       Top8 基准报告（8/8 的完整证据）
  HARMONYOS-PC-DEV-MAP.md        平台策略 / 生态分档 / 验证策略
  HARMONYOS-PC-ISSUES.md         ★ 坑账本，29 条
  POSTRUN-PLAN.md                后程诊断与当前缺口
  harmonyos-knowledge/           ★ 知识库本体（英文）
    INDEX.md                     入口与主题地图
    platform-and-toolchain.md    平台硬约束 / 工具获取 / 决策树
    scenario-{javascript,java,c}.md  分语言场景
    scenario-recipes.md          跨语言场景配方
    verification-and-evidence.md 验收标准与证据规则
    maintenance.md               更新协议与条目模板
    validate.cjs                 结构/链接校验脚本
  02-static/ … 07-redis/         逐场景的真实工程
frontend-toolchain-lab/          前端工具链专题（Vite/webpack/esbuild/rollup）
go-esbuild-lab/                  esbuild 本地编译
java-probe/                      Java 环境探测
node-fullstack-lab/ node-sanity/ Node 全栈与运行时自检
```

## 坑账本

[`dev-top8-lab/HARMONYOS-PC-ISSUES.md`](dev-top8-lab/HARMONYOS-PC-ISSUES.md) 是全库唯一允许写"负面结论"的地方。每条都有固定 id、状态、解除条件和复测触发点。

| 状态 | 条数 |
|---|---|
| `阻塞` | 6 |
| `可绕开` | 14 |
| `待验证` | 7 |
| `已解决` | 2 |
| 合计 | **29** |

`待验证` 不是"有问题"，是**没证据**——既不能说可用也不能说不可用。这是刻意的：不拿嗅探和推断冒充结论。

## 怎么用

- **想知道某件事能不能做** → 先查坑账本的 `PC-NN`，看状态和解除条件
- **想知道怎么做成** → 查 `harmonyos-knowledge/`，每条都有首选路径、失败判据、备选绕法
- **想复核** → 条目里带原始命令和证据路径，自己再跑一遍
- **改完知识库** → `node dev-top8-lab/harmonyos-knowledge/validate.cjs`

## 验证方法

整个项目建立在三条铁律上：

1. **项目级真实测试** —— 每场景建真实工程走「依赖 → 构建 → 运行 → 断言」，不接受 `which`/`ls` 嗅探式结论
2. **产物必须真执行** —— HTTP 200 不算通过，要用 jsdom / 真实浏览器 / 真机点击验证"能不能用"（这条规矩当天抓出 3 个"构建绿、运行必崩"的缺陷）
3. **判"不可用"前穷举渠道** —— 上面那三个翻盘的场景都是这条规矩救回来的

## 使用须知

- **不要用 `dev-top8-lab/reverify.sh` 当验证器。** 它有改源码、删构建产物、杀进程、Git stage/commit 等副作用，且内含签名相关值；其日志里 HAP 重建其实是失败的。
- 仓库内**不含**任何私钥、证书、口令或 profile 内容。签名与凭据一律走本机已有身份，凭据本身不入库。
- 知识库（`harmonyos-knowledge/`）正文是**英文**的，基准报告与坑账本是中文——这是历史演进的结果，不是有意割裂。

## 时效性

结论的保鲜期很短。鸿蒙 PC 的工具链、包渠道和签名策略都在动，所以：

- 每条知识都标了 `measured_on`（测于何时）和 `invalidate_when`（什么变了就该重测）
- 坑账本每条都有 `复测触发`
- 一个坑从 `可绕开` 翻成 `已解决` 时，要回头把知识库里的首选路径重跑一遍，并把配套的兜底方案标成过时——而不是让它继续留着

---

## English summary

A field record of running mainstream development workflows on a real **HarmonyOS PC** (HongMeng Kernel 1.13.0, aarch64/musl, OHOS SDK API 26) during 2026-09-28 → 09-30.

All eight benchmarked scenarios pass. The value here is not the scores but the constraints: the platform has a two-gate binary-execution model, a three-tier package channel, per-app sandbox isolation, and a retail signing gate that only accepts Huawei-issued certificates bound to the app's `bundleName`.

Two artifacts, deliberately kept apart:

- **`dev-top8-lab/harmonyos-knowledge/`** — what *works*, with a preferred path, a failure criterion and a time-bounded fallback per item. Written in English.
- **`dev-top8-lab/HARMONYOS-PC-ISSUES.md`** — the pit ledger: what *doesn't*, 29 entries, each with a status, a release condition and a retest trigger. Written in Chinese.

Every claim carries a measurement date and a reproduction path. Unmeasured things are marked unverified rather than guessed, and no negative statement is allowed to exist without a status attached.
