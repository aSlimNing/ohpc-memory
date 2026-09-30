---
id: harmonyos-pc-issues-ledger
document_kind: ledger
reviewed_on: 2026-09-30
---

# 鸿蒙 PC 开发问题账本（坑）

**这份文件不属于知识库。** `harmonyos-knowledge/` 只放"读完能做成事"的内容：正路怎么走、走不通时怎么绕。
"读完只知道自己做不成"的部分——也就是坑——记在这里，带状态和解除条件，等它被解决。

判定规则：一条内容读完你能把事情做成 → 知识，进知识库；读完只知道自己做不成 → 坑，进这份账本。
两者都沾边的，拆开写：判据和绕法进知识库，那个"做不成"本身记在这里。

## 计数口径

源提纲把 35 个横切问题分成若干类；各语言清单会把共享问题重复列一遍，逐行相加会重复计数。
唯一口径要挂在**刷新过一次的基准**上（见 [`BENCH.md`](BENCH.md)），不是重复场景行之和。
项目基准里也有被后续小节推翻的旧结论；引用时引带日期的具体小节和它的底层证据，不要照抄它的总结标题。

## 状态定义

- `阻塞` —— 当前没有可行路径，必须等平台/环境变化。
- `可绕开` —— 有已验证的绕法；绕法写在知识库里，见本条"绕法"字段的链接。
- `待验证` —— 只是没测过，**不等于不可用**。必须真跑过一次才能改判。
- `已解决` —— 已验证不再复现。翻成这个状态时，必须同步复测并退役对应的绕法条目（见下）。

## 联动规则（坑 ↔ 知识库）

每条坑的"绕法"字段指向知识库里那条三段式条目（首选路径 / 失败判据 / 备选绕法）。
坑一旦翻成 `已解决`，同一个动作里就要回到那条知识**真跑一次首选路径**：

- 首选通过 → 删掉绕法，或把它标成 `superseded` 并链接到新证据；
- 首选仍失败 → 保持 `可绕开`，更新失败判据和 `measured_on`。

不这么做，知识库会把已经失效的绕法当正路一直教下去（历史上"本机没有 pip"就是这么把 7 个技能套件带偏的）。

## 状态统计（2026-09-30）

| 状态 | 条数 | 编号 |
|---|---|---|
| `阻塞` | 6 | PC-02、PC-04、PC-08、PC-24、PC-25、PC-29 |
| `可绕开` | 14 | PC-01、PC-03、PC-05、PC-06、PC-07、PC-11、PC-12、PC-14、PC-19、PC-20、PC-22、PC-23、PC-27、PC-28 |
| `待验证` | 7 | PC-09、PC-10、PC-15、PC-16、PC-17、PC-21、PC-26 |
| `已解决` | 2 | PC-13、PC-18 |
| 合计 | 29 | |

---

## 清单

### PC-01 — 沙箱禁 ptrace，宿主侧断点调试不可用

- 场景: C/C++、Python 等一切靠 ptrace 的外部调试；不只影响 C/C++
- 现状: `可绕开`
- 现象: gdb 附加报 `ptrace: Permission denied`；lldb 附加失败
- 影响: 宿主侧不能下断点单步；core dump 连带不可用（见 PC-02）
- 绕法: [`harmonyos-knowledge/scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md#c-cpp--native-compile-execution-and-sanitizers) 的 `ptrace` 条目（Python 同理用进程内 `pdb`）
- 解除条件: 沙箱放开 ptrace，或提供可用的设备侧调试通道
- 复测触发: 沙箱策略、内核、权限模型或宿主 App 版本任一变化
- 证据: 2026-09-28/29 实测；来源 [`BENCH.md`](BENCH.md)、[`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-02 — 没有可用的 core dump

- 场景: C/C++ 崩溃现场分析
- 现状: `阻塞`
- 现象: 崩溃路径被配置成只读，落不出可用 core 文件
- 影响: 死后回溯（post-mortem）不可用
- 绕法: 无等价替代；改走 PC-03 的插桩路线或设备侧剖析
- 解除条件: 可写的 core 落盘路径或系统级崩溃收集渠道
- 复测触发: 沙箱策略或系统崩溃收集配置变化
- 证据: 2026-09-28/29 实测；来源 [`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-03 — LeakSanitizer 在本环境不支持

- 场景: C/C++ 内存泄漏检测
- 现状: `可绕开`
- 现象: LeakSanitizer 起不来（环境不支持）
- 影响: 拿不到 LSan 的泄漏报告
- 绕法: 编译 ASAN/UBSAN 插桩版本 + 进程内信号上报；必要时走设备侧剖析工具；见 [`harmonyos-knowledge/scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md#c-cpp--native-compile-execution-and-sanitizers)
- 解除条件: 环境支持 LeakSanitizer
- 复测触发: 编译工具链或运行时库版本变化
- 证据: 2026-09-28/29 实测；来源 [`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-04 — 缺 ArkTS 命令行断点调试客户端

- 场景: ArkTS / HAP 设备侧断点调试
- 现状: `阻塞`
- 现象: 可用的是 attach 通道，但没有配套的命令行断点调试客户端；完整断点调试链路没有建立起来
- 影响: 不能像 GDB/LLDB 那样在命令行里逐步调试 ArkTS
- 绕法: 无（退路是日志 + UI 断言：`hilog` + UITest 交互断言）
- 解除条件: 出现可用的命令行断点调试客户端
- 复测触发: DevEco / SDK / CLI 版本变化
- 证据: 2026-09-28/29 实测；来源 [`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-05 — 沙箱内 USB 设备访问被阻

- 场景: ArkTS / HAP 真机部署
- 现状: `可绕开`
- 现象: 被测的宿主↔设备连接下 USB 通道不可用
- 影响: 不能走 USB 装机
- 绕法: 无线 HDC（配对后 install → `aa start` → UI 断言）；见 [`harmonyos-knowledge/scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md#arkts--hap--native-app-build-and-device-loop)
- 解除条件: 沙箱放开 USB 设备直通
- 复测触发: 沙箱策略变化，或设备/宿主连接方式变化
- 证据: 2026-09-28/29 实测；来源 [`BENCH.md`](BENCH.md)

### PC-06 — SDK 只读 + 缺 `phone.json`

- 场景: ArkTS / HAP 构建
- 现状: `可绕开`
- 现象: 安装的 SDK 文件只读，且 `phone.json` 缺失，导致 syscap 输入不全
- 影响: 构建拿不到完整 syscap
- 绕法: 本地镜像/软链 SDK，并补上缺失的 SDK 元数据；注意 hmdfs 不支持 `ln -sf` 覆盖，要 `rm -f` 再 `ln -s`；见 [`harmonyos-knowledge/scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md#arkts--hap--native-app-build-and-device-loop)
- 解除条件: SDK 安装本身可写，或官方补齐 `phone.json`
- 复测触发: SDK 版本或安装方式变化
- 证据: 2026-09-28/29 实测；来源 [`BENCH.md`](BENCH.md)

### PC-07 — npm 原生依赖缺鸿蒙产物

- 场景: Web 前端 / Node（esbuild、Rollup、SWC、tailwind-oxide 等）
- 现状: `可绕开`
- 现象: 原生包没有可用的鸿蒙产物，或落地后不能直接执行；`ohos` 平台键不被支持时安装会回滚（`Unsupported platform: ohos arm64 LE`）
- 影响: Vite/webpack 这类默认拉原生二进制的工具链装不起来
- 绕法: 本地编译 esbuild + `ESBUILD_BINARY_PATH`；或 Rollup WASM；或 webpack 纯 JS 路径；见 [`harmonyos-knowledge/scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md#web-front-end--multiple-build-paths-and-real-browser-execution)
- 解除条件: 上游发布匹配 `harmonyos_aarch64` / `ohos` 的官方产物
- 复测触发: 前端工具链版本、npm registry、锁文件变化
- 证据: 2026-09-28/29 实测；来源 [`BENCH.md`](BENCH.md)、[`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-08 — 没有容器运行时

- 场景: 数据/基础设施
- 现状: `阻塞`
- 现象: 被测环境没有容器运行时
- 影响: 不能靠容器做隔离；进程隔离不等价于容器
- 绕法: 无
- 解除条件: 提供可用的容器运行时
- 复测触发: 环境/包渠道变化
- 证据: 2026-09-28/29 实测；来源 [`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-09 — PostgreSQL / MySQL 服务可用性未验证

- 场景: 数据服务
- 现状: `待验证`
- 现象: 没跑过真实安装/构建/启动/读写，因此**既不能说可用也不能说不可用**
- 影响: 依赖这两个库的方案目前无证据
- 绕法: 暂无（未验证，不是已知阻塞）
- 解除条件: 完成一次真实 install → start → 读写断言
- 复测触发: 相关包渠道出现官方产物时优先复测
- 证据: 无（未验证）；来源 [`scenario-recipes.md`](harmonyos-knowledge/scenario-recipes.md)

### PC-10 — NumPy / 科学计算原生 wheel 未验证

- 场景: Python
- 现状: `待验证`
- 现象: 未验证过 NumPy 及其依赖的原生 wheel 兼容性
- 影响: 不能从 pip 元数据或包列表推断它可用
- 绕法: 暂无（未验证）
- 解除条件: 用 `ohos_aarch64` 兼容 wheel 真装真跑一次
- 复测触发: 社区 wheel 索引出现匹配产物时优先复测
- 证据: 无（未验证）；来源 [`POSTRUN-PLAN.md`](POSTRUN-PLAN.md)

### PC-11 — 浏览器 MCP 网络采集漏请求

- 场景: Web 前端验证
- 现状: `可绕开`
- 现象: 一次测试里 favicon 404 没被 MCP 网络采集抓到
- 影响: 只看 MCP 网络面板会把"漏采"误判成"没发请求"
- 绕法: 与服务端日志交叉核对 + 放一个已知标记做负控；见 [`harmonyos-knowledge/verification-and-evidence.md`](harmonyos-knowledge/verification-and-evidence.md)
- 解除条件: 采集通道修复并复测通过
- 复测触发: 浏览器/扩展/MCP 版本变化
- 证据: 2026-09-28/29 实测；来源 [`frontend-toolchain-lab/RESULTS.md`](../frontend-toolchain-lab/RESULTS.md)

### PC-12 — `reverify.sh` 不安全且已过时

- 场景: 全场景复验
- 现状: `可绕开`
- 现象: 脚本内含改源码、删构建产物、杀进程、Git stage/commit 副作用，以及硬编码的签名相关值；其日志显示 HAP 重建 `BUILD FAILED`，随后只是给一个已存在的 102,448 字节 HAP 签了名
- 影响: 把它当权威端到端验证器会得出假绿结论
- 绕法: 不执行整脚本；逐条审阅后只挑无害命令单独复跑；见 [`harmonyos-knowledge/verification-and-evidence.md`](harmonyos-knowledge/verification-and-evidence.md)
- 解除条件: 该脚本被删除，或被重写为无副作用版本且 HAP 重建真实复跑通过
- 复测触发: 该脚本被修改或删除时
- 证据: [`reverify.sh`](reverify.sh)、[`reverify-final.log`](reverify-final.log)

### PC-13 — 基线环境没有可用系统 JVM（已解决）

- 场景: Java
- 现状: `已解决`
- 现象: 基线里没有现成可用的系统 JVM；只有 `java` shim 不能证明 JDK 存在
- 影响: 当时 Java 场景无法启动
- 绕法: 经 HarmonyBrew 安装 JDK（本机验证过 OpenJDK 26.0.2.1 + Maven 3.9.16_1）；见 [`harmonyos-knowledge/platform-and-toolchain.md`](harmonyos-knowledge/platform-and-toolchain.md#user-provided-and-verified-harmonybrew-history)
- 解除条件: 已满足
- 复测触发: HarmonyBrew 前缀或 JDK 包版本变化
- 证据: 2026-09-28 用户提供线索、随后本机安装并实测通过（来源 [`BENCH.md`](BENCH.md)）
- 备注: 翻成 `已解决` 后，知识库里 HarmonyBrew 那条仍是正路（不是绕法），保留；但"基线无 JVM"这句旧结论已作废，不要再当成当前事实复述

### PC-14 — 外部下载的 ELF 需签名才能执行

- 场景: 全语言（Node/Python/Go/Rust 等官方下载包）
- 现状: `可绕开`
- 现象: 从官方渠道下载的 ELF 落地后直接执行失败；官方 OpenHarmony Node 就踩过这条
- 影响: 官方产物不能开箱即用
- 绕法: 走本机可用的自签流程（`binary-sign-tool sign -selfSign 1`），或对源码本地重编译；注意 `.codesign` 段必须 **4096 对齐**，否则等同没签（判据与反例见 PC-28）；见 [`harmonyos-knowledge/platform-and-toolchain.md`](harmonyos-knowledge/platform-and-toolchain.md#native-executable-decision-tree)
- 解除条件: 官方分发的 HNP 包/产物已带合规签名
- 复测触发: 官方包版本或签名工具链变化
- 证据: 2026-09-28/29 实测；来源 [`BENCH.md`](BENCH.md)
- 备注: 宿主 ELF 自签与零售 HAP 应用签名是**两道不同的门**，不可互相替代

### PC-15 — HAP 内嵌 JVM：需逐个自签 65 个 ELF + 声明可写代码内存权限

- 场景: Java（应用内嵌 JVM，ArkTS + JVM 混合开发；与宿主侧 Java 是两回事）
- 现状: `待验证`
- 现象: 文档要求把 JRE 里的 **65 个 ELF**（含 JNI 库）逐个 `binary-sign-tool sign -selfSign 1` 自签，并声明 `ohos.permission.kernel.ALLOW_WRITABLE_CODE_MEMORY`；文档没说这个签名工具从哪来，也没说**系统权限**和**ELF 签名**两道门谁先谁后
- 影响: 照文档做，任一步缺失都表现为加载 `Permission denied` 或 JVM 启动失败，且没有错误码可判
- 绕法: 首选路径/失败判据见 [`harmonyos-knowledge/scenario-java.md`](harmonyos-knowledge/scenario-java.md#b-embedding-a-jvm-in-an-arkts-app)；宿主侧 Java 不需要走这条，走 PC-13 的正路
- 解除条件: 有一个被真实复跑过的内嵌 JVM 最小工程，并说明两道门的先后
- 复测触发: BiSheng JDK 版本、SDK 签名工具链、或宿主 App 版本变化
- 证据: 文档 `J1:310-326`、`J1:136-142`（doc-derived，未在本机复跑）
- 备注: 另有未解细节——见 PC-19 的签名说法冲突；不要把密码/私钥/证书写进任何知识文件

### PC-16 — JNA 在鸿蒙上 `Platform.getOSType()` 返回 -1

- 场景: Java（JNA 调用原生库，含内嵌与宿主）
- 现状: `待验证`
- 现象: 文档称该环境下 `getOSType()` 返回 **-1**，JNA 无法自行判定平台
- 影响: 依赖 JNA 平台自动分支的代码会走错分支
- 绕法: 显式指定平台、避免依赖 `getOSType()` 的自动判定；见 [`harmonyos-knowledge/scenario-java.md`](harmonyos-knowledge/scenario-java.md#b-embedding-a-jvm-in-an-arkts-app)
- 解除条件: 本机复跑确认，或上游 JNA 增加鸿蒙分支
- 复测触发: JNA 版本或 JDK 版本变化
- 证据: 文档 `J1:578`（doc-derived）

### PC-17 — 官方运行时的 JS 兼容层不支持动态函数与 `eval`

- 场景: JavaScript（官方 Node 运行时的内置模块/兼容层）
- 现状: `待验证`
- 现象: 文档称兼容层不支持动态函数、`eval`，且 nodejs/web 内置模块需要鸿蒙 SDK 的替代实现
- 影响: 依赖 `eval`/动态代码生成的库在官方运行时上跑不起来
- 绕法: 先在 Qoder 自带 Electron Node 上验证（实测可跑 Express 5）；确需官方运行时时先做兼容性筛查；见 [`harmonyos-knowledge/scenario-javascript.md`](harmonyos-knowledge/scenario-javascript.md#platform-lifetime-details-worth-knowing)
- 解除条件: 官方兼容层补齐，或本机复跑界定受限范围
- 复测触发: 官方运行时版本变化
- 证据: 文档 `JS-adapt:45-47`（doc-derived）

### PC-18 — 官方 Node 运行时的获取（原判「本机拿不到」，已改判）

- 场景: JavaScript（需要官方运行时，而非 Electron 自带 Node）
- 现状: `已解决`
- 原判（已作废）: `[measured 2026-09-30]` `/data/service/hnp` 里没有 node 包，据此写成「本机拿不到官方运行时」。**后半句是错的**，不要再复述
- 更正后的事实: ① 渠道就在文档里——`aggregate/【运行时】开源运行时汇总.md` 直接链到 `gitcode.com/OpenHarmonyPCDeveloper/DevNode-OH/tree/main/hnp/arm64-v8a`（24.13.0），另有应用市场版 DevNode（`com.develop.opensource.ohdpc.devnode`）；② 产物就在本机 `node-ohos/node.hnp`（54,319,852 B，sha256 `2e260da9…`），解包后的 `node_signed` 实跑 `v24.13.0`、`process.platform=openharmony`、`arch arm64`、V8 `13.6.233.17-node.37`，连跑 3 次 exit 0，`require('os')` 正常
- 影响: 无（可获取、可执行）
- 绕法: 正路＝按文档渠道取 HNP 包，再走签名门（PC-14，对齐要求见 PC-28）。Qoder 自带 Electron Node 仍可用，但它是「没取官方包时」的替代，不是必需替代
- 解除条件: 已满足
- 复测触发: HNP 包集合、DevNode-OH 仓库或签名门变化
- 证据: 2026-09-30 本机实测（sha256 `ed3aa40f1ac110cc…`、`--version` → `v24.13.0`、exit 0 ×3）+ 文档运行时汇总表
- 备注: 与 PC-13 同一类教训——「HNP 里没有」只等于「没装在 HNP」，不等于「拿不到」

### PC-19 — 文档对 ELF 签名有三种互相矛盾的说法

- 场景: 全语言（移植/内嵌后的 ELF 能否执行）
- 现状: `可绕开`
- 现象: 同一批文档并存三种说法：`binary-sign-tool`「可能需要签名」、`sign-elf`「强制签名」、以及「HarmonyBrew 的 `ohos-sdk` 产物已自动签名」
- 影响: 信「已自动签名」会得到一个不能执行的二进制，而且没有提示
- 绕法: 以实测为准——拷贝会丢 `.codesign`，宿主自签路径可用；见 [`harmonyos-knowledge/platform-and-toolchain.md`](harmonyos-knowledge/platform-and-toolchain.md#native-executable-decision-tree)
- 解除条件: 文档统一，或复跑确认哪条为真
- 复测触发: 文档更新或签名工具链变化
- 证据: 文档 `JS-embed:720`、`JS-ports:73/638/251`；实测与 PC-14 同源

### PC-20 — Node 内嵌 Model B（进程内 `libnode`）只是理论方案

- 场景: JavaScript（应用内嵌 Node）
- 现状: `可绕开`
- 现象: 文档自己把 Model B 的代码标为「理论」，并列出四个高难点：113 MB ELF 变 `libnode.so`、与鸿蒙 NAPI 运行时符号冲突、V8 内部头文件适配、GN/Ninja 桥到 CMake
- 影响: 按 Model B 做会卡在符号冲突与构建系统上
- 绕法: 走 Model A（子进程 + NAPI launcher：`fork` + `execl` + `NODE_PATH`）；见 [`harmonyos-knowledge/scenario-javascript.md`](harmonyos-knowledge/scenario-javascript.md#c-embedding-node-in-a-hap)
- 解除条件: 上游给出可用的 `libnode.so` 与配套构建脚本
- 复测触发: 官方运行时或嵌入文档更新
- 证据: 文档 `JS-embed:522`、`JS-embed:561-568`

### PC-21 — 内嵌 BiSheng JVM 的设备侧诊断能力未验证

- 场景: Java（应用内嵌 JVM 的后程调试）
- 现状: `待验证`
- 现象: 文档只提到 `jlink`，没有内嵌 JVM 设备侧 `jps`/`jcmd`/`jstack`/GC 观测的说明；宿主侧这些工具实测可用，但**不能外推**到内嵌 JVM
- 影响: 内嵌 JVM 出问题时没有已知的现场观测手段
- 绕法: 暂无已验证路径（未验证，不是已知阻塞）；先在宿主侧把逻辑跑通再内嵌；见 [`harmonyos-knowledge/scenario-java.md`](harmonyos-knowledge/scenario-java.md#a-host-side-java)
- 解除条件: 在设备上对内嵌 JVM 真正跑通一次诊断命令
- 复测触发: BiSheng JDK 或 SDK 版本变化
- 证据: 文档 `J1`（doc-derived）；宿主侧实测见 [`scenario-java.md`](harmonyos-knowledge/scenario-java.md)

### PC-22 — C/C++ 移植指南里没有可用的交叉编译参数

- 场景: C/C++（交叉编译/移植三方库）
- 现状: `可绕开`
- 现象: 全文档检索：目标三元组 `aarch64-linux-ohos`、`${OHOS_NDK}/native/llvm/bin/clang`、`--sysroot` 只出现在**一个文件**里，而那是 Node.js 移植指南，不是任何 C/C++ 指南；C/C++ 指南走的是「设备上跑 AI Agent 原生编译」的另一套模型
- 影响: 想按 C/C++ 文档交叉编译会找不到参数
- 绕法: 借用 Node 指南里的通用三元组/编译参数（`CFLAGS`/`CXXFLAGS`/`LDFLAGS` 三个都要设），配合本机 `ohos-sdk_26.0.0.18/ohos` 的 `native/llvm` + `native/sysroot`（实测存在且可执行）；见 [`harmonyos-knowledge/scenario-c.md`](harmonyos-knowledge/scenario-c.md#b-porting-a-cc-library--and-the-documentation-gap)
- 解除条件: C/C++ 指南补上交叉编译章节
- 复测触发: 文档更新
- 证据: 全库检索 + 2026-09-30 实测 SDK 布局

### PC-23 — Agent 框架安装脚本无法核验，且与 SELinux 说明自相矛盾

- 场景: C/C++（设备端 AI Agent 编译框架的安装）
- 现状: `可绕开`
- 现象: 安装是远程脚本 `wget … && chmod 777 ./setup_wizard.sh && ./setup_wizard.sh`，另有一处直接 `curl … | sh`；同一仓库别处又给出不带管道的写法；而同一批文档又说 SELinux 限制 `chmod`
- 影响: 脚本内容不可核验；`chmod 777` 与 SELinux 说明冲突，实际能否执行不确定
- 绕法: 不要照抄整条安装命令；逐条审阅后再单独执行；见 [`harmonyos-knowledge/scenario-c.md`](harmonyos-knowledge/scenario-c.md#b-porting-a-cc-library--and-the-documentation-gap)
- 解除条件: 框架提供可核验的发布包与校验值
- 复测触发: 框架/文档版本变化
- 证据: 文档 `C-agent:130`、`C-agent:116`、`C-agent:49`、`C-atom:57`、`C-atom:46`

### PC-24 — FPC/Pascal 交叉编译流程要求 Windows/x86-64 宿主

- 场景: Pascal / FPC
- 现状: `阻塞`
- 现象: 文档给出的流程基于 Windows + `Build.bat`，是在 Windows 上搭交叉编译环境，不是在鸿蒙 PC 本机跑
- 影响: 在本机无法按文档落地 FPC 交叉编译
- 绕法: 无（文档未提供本机流程）
- 解除条件: 出现可在本机执行的 FPC 交叉编译流程
- 复测触发: 文档更新或 FPC 版本变化
- 证据: 文档 `C-pascal:3`、`C-pascal:13`、`C-pascal:16`（doc-derived）

### PC-25 — Qt 模板下载指向内网主机

- 场景: C/C++（Qt 上机）
- 现状: `阻塞`
- 现象: 文档给的模板下载地址是内网主机 `http://codereview.qtcompany.cn:29416/…`，公网不可达
- 影响: 按文档拿不到 Qt 模板
- 绕法: 无（需从公开渠道另找模板）
- 解除条件: 出现公开可下载的 Qt for OpenHarmony 模板
- 复测触发: 文档更新
- 证据: 文档 `C-qt:82`（doc-derived）

### PC-26 — 迁移工具清单自相矛盾（数量与链接都对不上）

- 场景: C/C++（三方库鸿蒙化迁移工具选型）
- 现状: `待验证`
- 现象: 同一份清单里 harmonybrew 写「4000+」、`ohos_vcpkg` 写 1000+、`lycium_plusplus` 一处写「几百个」另一处表格写「200+」；且 `lycium_plusplus` 给的链接实际指向 `ohos_vcpkg`
- 影响: 无法据此判断该用哪个渠道、覆盖多少库
- 绕法: 不按数量选型；按能否真装真跑验证——本机实测这三者都没装（只有 `hnpcli`）；见 [`harmonyos-knowledge/scenario-c.md`](harmonyos-knowledge/scenario-c.md#library-channels)
- 解除条件: 清单的数量与链接被更正并可核验
- 复测触发: 文档更新
- 证据: 文档 `C-tools:12/19/20/21`（doc-derived）+ 2026-09-30 本机探测

### PC-27 — 记忆管理页「打开记忆文件」必然失败（走系统打开器）

- 场景: 宿主 App（Qoder 鸿蒙版 0.4.1）「记忆管理」页点铅笔打开记忆文件；全局记忆与项目记忆都命中，与本机是否有该文件无关
- 现状: `可绕开`
- 现象: 弹窗「无法打开记忆文件，请检查路径是否存在且可访问。」；同一时段主进程日志 4 条（+0800 10:27:43/46/47/54，与用户连点 4 次吻合）：
  `[UserMemory] 打开本地记忆失败 {"scope":"project","errorCode":"LINUX_SYSTEM_OPENER_UNAVAILABLE","errorName":"Error"}`（末条 `scope` 为 `global`）
- 影响: 该 UI 入口拿不到文件内容；错误文案把原因归给"路径不存在或不可访问"，与实测不符——同日复核：`~/.qoder/memory/` 有 45 个 `.md`，各项目 `~/.qoder/projects/<编码工作区>/memory/` 也在，权限 `0664` 全部可读
- 绕法: 记忆文件就是磁盘上的普通 Markdown，按路径直接读改；要人眼看就复制到 `/storage/Users/currentUser/Download` 再用文件管理打开；见 [`harmonyos-knowledge/platform-and-toolchain.md`](harmonyos-knowledge/platform-and-toolchain.md#host-app-open-actions)
- 解除条件: 宿主 App 给 `ohos` 平台补上内部编辑器，或提供可用的系统打开器（不再返回 `LINUX_SYSTEM_OPENER_UNAVAILABLE`）
- 复测触发: 宿主 App 版本变化（本次 0.4.1）；点铅笔后不再弹错即改判
- 证据: 2026-09-30 用户实测 + 用户截图（记忆管理页与 toast）；日志 `/data/storage/el2/base/files/com.qoder.app.stable/logs/20260930-014301.230-49555-f1d71d52/main.log` 第 700–703 行
- 备注: 只测到"这个动作"失败，**没有**证明 App 内其他打开动作也失败；成因是 App 侧平台分支缺失（同族见 PC-29），不是路径或权限问题
- 迁移尝试（2026-09-30 实测，**已回滚**）: 把记忆目录搬到可见目录 `/storage/Users/currentUser/Download/qoder-memory/`、原位留软链，46 处（1 全局 + 45 项目）逐字节比对一致后切换 → 记忆页立刻报「**无法读取记忆**／请检查本机记忆目录权限」。即 **App 不认软链**（或不接受配置目录之外的路径）。已全部还原，数据无损（还原后与搬迁副本逐字节比对一致）。结论：记忆目录必须留在原位，可见目录里只能放"副本"

### PC-29 — 远程控制 / 移动端联动永久失败（设备 ID 解析没有 `ohos` 分支）

- 场景: 宿主 App（Qoder 鸿蒙版 0.4.1）设置里的远程控制 / Mobile Integration；移动端扫码联动
- 现状: `阻塞`
- 现象: 开关打开也连不上；主进程日志自 App 启动起持续两条成对出现——
  `[ERROR] [main] [DeviceIdentity] REMOTE_CONTROL_DEVICE_ID_UNAVAILABLE` 与 `[WARN] [main] [QoderRemoteControl] Remote Control 操作未完成 {"failureCode":"REMOTE_CONTROL_DEVICE_ID_UNAVAILABLE"}`
  本次会话 2026-09-30 01:43:03Z（启动即开始）至 06:20:40Z 共 **1115 次**，约每 15s 一次，且是唯一 failureCode；同期 `openapi.qoder.sh` 请求 200/204 正常，与网络、账号无关
- 影响: 环境注册（`POST /environments/bridge` 需要 device_id）永远发不出去，phase 停在非 ready
- 绕法: 无（现有逃逸口够不到，见备注）
- 解除条件: App 给设备 ID 解析补一个 `ohos` 分支（按 `linux` 处理即可，`XDG_CONFIG_HOME` 在鸿蒙上已有值），或让 GUI 主进程环境带上 `QODER_HOME`
- 复测触发: 宿主 App 版本变化（本次 0.4.1，bundle 构建于 2026-09-24）；日志里该错误码不再增长即改判
- 证据: 2026-09-30 读取装机 bundle 复核代码 + 同日日志计数
- 代码复核（2026-09-30，读取装机 bundle 的 `app.asar`）：解析设备 ID 的函数只按 `darwin` / `win32` / `linux` 三种平台分支取值，鸿蒙上 `process.platform` 不是这三者，于是走到最后一行直接抛 `Unsupported platform for Qoder device ID`；该异常被上层 `DeviceIdentity` 的 `.catch()` 吞掉，转成 `REMOTE_CONTROL_DEVICE_ID_UNAVAILABLE`，所以外部只看得到错误码。函数名与逐字摘录不入库，按宿主版本重读 bundle 即可自行复核
- 备注: 与 PC-27 同族，都是 App 侧缺 `ohos` 平台分支。`QODER_HOME` 是唯一现成逃逸口，但够不到：GUI 主进程 env 里没有它（`/proc/<pid>/environ` 实测只有 `HOME`/`XDG_CONFIG_HOME`/`XDG_CACHE_HOME`），全盘无任何设备 ID 缓存文件，而 `aa start` 只提供 `--ps/--pi/--pb`（want 参数）与 `-e <entity>`，**没有传环境变量的选项**，无法从外部注入

### PC-28 — `.codesign` 段未按 4096 对齐的 ELF 一律 EACCES

- 场景: 全语言（自签 / 补丁后的 ELF 能否执行）
- 现状: `可绕开`
- 现象: `[measured 2026-09-30]` 同一目录 6 个变体的真实 errno 见下表；`node_cs` 与 `node_signed` 的唯一实质差别就是 `.codesign` 的对齐值，一个拒一个过

| 文件 | `.codesign` | errno（`spawnSync` 实测） |
|---|---|---|
| 原始包 `node`（HNP 内） | 无 | EACCES |
| `node_noshdr` / `node_stripped`（e_shnum 清零） | 无 | EACCES |
| `node_s2` | 无 | EACCES |
| `node_cs` | `size=0x1000` **align=1** | EACCES |
| `node_signed` | `size=0x1000` **align=4096** | 无 → 跑通（`v24.13.0`） |
| `h2`（改过 shdr 的 hello） | — | **EPERM** |

- 影响: 只把 `.codesign` 塞进去、不管对齐，会被误判成「签名无效」而反复重签
- 绕法: 让 `.codesign` 段 **4096 对齐**；改完先跑一次最小 `--version` 再谈别的；见 [`harmonyos-knowledge/scenario-javascript.md`](harmonyos-knowledge/scenario-javascript.md#a-running-node-on-the-pc) 与 [`harmonyos-knowledge/platform-and-toolchain.md`](harmonyos-knowledge/platform-and-toolchain.md#native-executable-decision-tree)
- 解除条件: 官方说明该对齐要求，或签名工具自动处理对齐
- 复测触发: 签名工具链或平台版本变化
- 证据: 2026-09-30 本机实测（`node-ohos/` 6 变体 errno 对照；`node_signed` sha256 `ed3aa40f1ac110cc…`）
- 备注: 我曾用 `timeout "$f"`（漏 `./`）得出「127＝解释器缺失」，那是命令写错导致的 PATH 查找失败，**已作废**；真实 errno 是 EACCES
