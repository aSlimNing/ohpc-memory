# PPT 大纲（v2）：鸿蒙 Coding 实测 —— 逐语言的问题与实况

> **主线**：不是"能开发什么"，而是"每种语言真去写代码时，**在哪一步撞墙、为什么、怎么绕**"。
> **结构**：平台策略 → 验证方法 → 问题总览 → **每个语言单独一页** → 配方 / 分级 / 建议 / 行动
> **规模**：8 条语言/场景线，**35 个真实问题**（编号按语言归类），全部附复现命令与原始输出。

---

## Slide 1 · 封面
**鸿蒙 Coding 实测：逐语言的问题、实况与解法**
副标题：8 条开发线 × 真实工程 × 真机闭环 ｜ 2026-09

---

## Slide 2 · 一句话结论
- **能力**：8 条线全部跑通，鸿蒙原生"装机→启动→点击"也闭环
- **代价**：**35 个真实问题**，6 个会让人误判"环境坏了"
- **总规律**：鸿蒙 PC 的编程问题**多半不是你代码的问题**，而是平台策略的副作用 —— 先判断"属于哪一类"，再决定改代码还是换路径
- 问题分布：鸿蒙原生 7 ｜ C/C++ 5 ｜ Java 4 ｜ Node 6 ｜ Python 3 ｜ Web 前端 6 ｜ 数据层 3 ｜ 公共 5（有重叠）

---

## Slide 3 · 验证方法（为什么这些问题可信）
- **三条铁律**：项目级真实测试 ｜ 产物必须真执行（HTTP 200 不算）｜ 判"不可用"前穷举渠道
- **三层证据**：主机产物 → 真机行为 → 量化阈值
- **反假绿三招**：注入 marker 自证采集有效 / 加负控（故意失败）/ 自检必须打印数值与阈值
- 一切可复跑：`reverify.sh` + 原始日志

---

## Slide 4 · 作战地图 ①：平台四条策略
| 策略 | 实质 | 对开发的影响 |
|---|---|---|
| **沙箱隔离** | 应用/IDE 工具链零共享 | Studio 已装但外部探测不到 ⇒ 要么人在 IDE 里操作，要么找 CLI 替代 |
| **二进制门禁** | ① shdr 不规范→**无解**（只能本地重编译）② `.codesign` 缺失→**可自签** | 同类报错（permission denied）但处置完全不同 |
| **包管理三层** | HNP（系统 54 包）/ HarmonyBrew（用户 56 bottle）/ npm·pip | 缺工具先查三层，再找官方生态仓库 |
| **部署签名门禁** | 零售机只认华为证书 + 绑定 bundleName 的 profile | 三档错误码已实测定位 |

## Slide 5 · 作战地图 ②：三方生态分档
- **成熟**：C/C++ 全链（clang15/CMake4.1/Ninja/lldb）、Python 3.12、Perl/Ruby、Git、Redis 8.4、SQLite、hdc、官方 Node 24.13、Java（HarmonyBrew 毕昇）
- **半可用（需技巧）**：前端 native 链（本地重编译/WASM）、Rust/Go（社区 OHOS 工具链）
- **缺失**：DevEco CLT 鸿蒙版、`sp_daemon`/图形化 Profiler、容器
- **官方入口**：gitcode `OpenHarmonyPCDeveloper`（docs / DevNode-OH / 毕昇 JDK / Go / Rust）

---

## Slide 6 · 问题总览（六类 · 35 项）
| 类 | 数量 | 一句话 |
|---|---|---|
| ① 执行门禁 | 5 | 能编译不能跑：shdr/codesign/无 glibc |
| ② 生态缺位 | 6 | npm 平台键、npx、Vite、CLT、容器 |
| ③ 沙箱隔离 | 8 | IDE 不可见、ptrace 禁、双根、/tmp、无 core |
| ④ 部署签名 | 6 | 华为门禁三档码、bundleName、锁屏 |
| ⑤ 工具链拼装 | 5 | SDK 只读/缺件、无预置 JVM·Node、env 必需 |
| ⑥ 质量陷阱 | 5 | HTTP 200 掩盖必崩、sourcemap、自检假绿、采集盲区 |

---

# 逐语言（每页一图一表：定性 · 实况 · 问题 · 配方）

## Slide 7 · 鸿蒙 ArkTS / HAP —— ✅ 全链路闭环
**定性**：能写、能编、能签、能装、能跑、能点、能看日志 —— **唯一完全闭环的原生线**
**实况**：增量编译 **29 s**（28 tasks/11 executed）｜`sign-app success` + `hap verify successed!`｜产物 **102,448 B**｜`hdc install` 成功｜`aa start` 成功｜UI 计数 **0→3**（uitest 点击）
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| ARK-1 | 华为签名门禁 | `9568257 fail to verify pkcs7` | 用华为签发证书+profile |
| ARK-2 | profile 绑定 bundleName | `9568329 verify signature failed` | 包名须与 profile 一致；换名回 Studio |
| ARK-3 | 漏代码签名 | `9568393 verify code signature failed` | `-signCode 1` 不能漏 |
| ARK-4 | USB 通道不可用 | 本机是 gadget 角色 + `/dev/bus/usb` 被拒 | 走无线调试 |
| ARK-5 | 锁屏阻断启动 | `10106102 screen is locked`（开发者模式不自动解锁） | 用例前置解锁 |
| ARK-6 | SDK 只读 + 缺件 | 需镜像+软链；缺 `phone.json` 致 syscap 交集为空 | 手补 + 逐项软链 |
| ARK-7 | 断点调试无 CLI 客户端 | `aa attach` 在，缺连它的调试器 | 待定案（借 Studio 或自建） |
**配方**：无线 hdc + Studio 签名身份离线复用（口令可解）+ `-profileSigned 1 -signCode 1`

---

## Slide 8 · C / C++ —— ✅ 编译运行，⚠️ 调试受限
**定性**：工具链最完整，但**调试能力被沙箱截断**
**实况**：clang 15 直连 **299 ms** vs CMake+Ninja **1,959 ms**（产物同 18,816 B）｜`native ok` rc=0｜**ASAN 抓到 heap-buffer-overflow 并指出源码行**｜lldb 15.0.4 在位
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| CPP-1 | 沙箱禁 ptrace | `gdb → ptrace: Permission denied`；`lldb → 'A' packet error` | 无解；改 ASAN/UBSAN 插桩 |
| CPP-2 | 无 core dump | `core_pattern=/core-%T-%E` 且根只读 | 应用内信号处理落盘 |
| CPP-3 | LeakSanitizer 不支持 | `detect_leaks is not supported` | 组合替代（heap-prof / hiprofiler memory） |
| CPP-4 | CMake 不识别平台 | `System is unknown to cmake ... Platform/HarmonyOS` | 自建平台文件（警告级） |
| CPP-5 | `/proc/meminfo` 解析失败 | CMake 启动即报 `Problem parsing /proc/meminfo` | 可忽略（噪声） |
**配方**：把 ASAN 编进构建（唯一可用的内存缺陷检测手段）

---

## Slide 9 · Java —— ✅ 生产可用（需自建渠道）
**定性**：**生态最"像样"**的一条线：编译、测试、诊断全套齐
**实况**：JDK **26.0.2.1** + Maven **3.9.16**（HarmonyBrew）｜`mvn package` **21.5 s**｜JUnit **3/3 通过**｜`java -jar` → `created ORD-1, total=1`｜后程 `jps / jcmd VM.version / jstack(19 线程) / GC.heap_info / jfr` 全通
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| JAVA-1 | 系统预置无 JVM | 54 个 HNP 包无 jdk；`java` 只是转发 shim | HarmonyBrew 或毕昇 JDK HNP |
| JAVA-2 | 渠道安装有门槛 | HarmonyBrew 需 zsh + 离线包；bottle 56 个 | 已跑通，一次装好 |
| JAVA-3 | 双根路径 | `~` 与 `/storage/Users` 不同根 | `JAVA_HOME`/PATH 用绝对路径 |
| JAVA-4 | JNI 原生库待验 | 本地自编 `.so` 需过执行门禁 | 按门禁两类处置（自签/重编） |
**配方**：`HarmonyBrew + mvn + jcmd/jstack`，Java 后端与诊断完全可落地

---

## Slide 10 · Node.js —— ✅ 双形态可用
**定性**：**官方鸿蒙原生版已存在**，但 npm 生态还没跟上
**实况**：Electron 垫片 v24.11.1 + **官方 OpenHarmony Node 24.13**（自签后可跑，`process.platform=openharmony`）｜Express 5 全栈：**69 包 3 s** 装完、接口断言通过、**重启后数据持久化**｜`--cpu-prof` 真产出 `.cpuprofile`
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| NODE-1 | npm 不认 ohos 平台键 | `Unsupported platform: ohos arm64 LE` → **整包回滚** | `--ignore-scripts` + 纯 JS 包 |
| NODE-2 | `npx` 不可用 | 脚手架类用法失效 | 直接用 `node_modules/.bin` + node |
| NODE-3 | 原生 Node 需自签 | 下载即执行 → `permission denied` | `strip` + `binary-sign-tool -selfSign 1` |
| NODE-4 | 无系统 node | 垫片 `process.platform=ohos` 加剧生态误判 | 换官方原生 node |
| NODE-5 | npm 缓存走双根 | 默认 cache 在 `~` | `--cache <绝对路径>` |
| NODE-6 | stderr 噪声 | 每命令打 `Failed to set thread qos` | 过滤忽略 |
**配方**：官方 Node HNP + 自签 + `--ignore-scripts` + 纯 JS 依赖

---

## Slide 11 · Python —— ✅ 生产可用
**定性**：**脚本/服务/调试三件套开箱可用**，坑集中在安装路径
**实况**：Python **3.12.8** + pip **24.3.1** + Flask **3.1.3**（`{"msg":"py ok","ok":true}`）｜后程 **`pdb` 真断点命中**｜`cProfile + pstats` 出 cumtime 统计
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| PY-1 | pip 与解释器不同根 | "装过却 `ModuleNotFoundError: flask`" | 工程内 `--target` + 显式 `PYTHONPATH` |
| PY-2 | 无外部调试器 | 不能用 gdb 类附加（ptrace 禁） | `pdb` 进程内调试足够 |
| PY-3 | 科学计算栈未验 | numpy 类原生 wheel 能否装/跑 **未验证** | 待单独验证（不臆断） |
**配方**：`.pylibs` 工程内安装 + `PYTHONPATH`，让环境自包含可复跑

---

## Slide 12 · Web 前端（TS / React / Vite） —— ✅ 三条路径
**定性**：**主流工具链全部要"解锁"**，解锁后体验接近正常
**实况**：Vite（本地编 esbuild）**6.4 s** → dist → preview 200 → **浏览器真渲染+真交互**｜webpack 纯 JS **10.4–11.5 s**→233 KB，jsdom 冒烟 0 错｜Rollup WASM 15.5 s｜后程 **vitest 10/10（6.5 s）**、`eslint` 0、`tsc -b --force` 0 错、浏览器 console 0 条、network 6/6 200、**DCL 116 ms**
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| WEB-1 | 原生包无 ohos 构建 | esbuild / rollup@4 / SWC / tailwind-oxide 全不可用 | 本地重编译 esbuild / WASM 替代 |
| WEB-2 | env 必需 | 不设 `ESBUILD_BINARY_PATH`，`vite build` **与 `npm test` 都失败** | 固化进 npm 脚本 |
| WEB-3 | webpack 路径隐藏必崩 | 200 却 3 缺陷：注入缺失/不产 html/CSS Modules 具名导出 | 修复后 jsdom 冒烟通过 |
| WEB-4 | sourcemap 泄漏 | `.map` 残留 `__APP_VERSION__`/`import.meta.env` 原文 | 发布前剥离 |
| WEB-5 | jsdom 需 `runScripts` | 否则 `window.eval` 退化到 Node 作用域（假失败） | 测试脚手架正确配置 |
| WEB-6 | 采集盲区 | MCP 网络列表漏 `favicon 404` | 以服务端日志 + 负控为准 |
**配方**：`本地编 esbuild + ESBUILD_BINARY_PATH + rollup→wasm-node`

---

## Slide 13 · 数据层（Redis / SQLite） —— ✅
**定性**：KV 与嵌入式关系库都可用，含调优能力
**实况**：Redis **8.4.0**（`INFO server` / `slowlog` / `dbsize`）｜SQLite `EXPLAIN QUERY PLAN`：`SCAN t` → 建索引后 **`SEARCH t USING INDEX ia`**
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| DATA-1 | `/tmp` 只读 | redis `--logfile /tmp/...` 直接启动失败 | 日志指向工作区 |
| DATA-2 | 无 `sqlite3` CLI | 只能用 Python 标准库 | 脚本化即可 |
| DATA-3 | 无 PG/MySQL 服务端 | 未验证/缺包 | 待验证或改用嵌入式 |
**配方**：Redis 用 `--daemonize yes --logfile <工作区>`；SQLite 直接用 Python stdlib

---

## Slide 14 · 工程协作与公共（Git / 观测 / 部署通道） —— ✅
**定性**：Git 与设备观测能力齐备，坑都是"平台特性"
**实况**：Git 全流程（含裸库推拉）｜`hilog` 实时日志、`snapshot_display` 截图、`uitest` 定位+点击、`hidumper` **PSS 24,281 kB / CPU 16.96%**、`hitrace` **279 KB/3 s** 拉回主机、`hdc fport` **OK**、`hiprofiler` 10+ 插件（cpu/gpu/memory/network/diskio/ftrace/hiperf/hilog/hisysevent）
**问题**
| ID | 问题 | 现象/证据 | 处置 |
|---|---|---|---|
| COM-1 | hmdfs 属主 | git `dubious ownership` | `safe.directory '*'` |
| COM-2 | 视野漂移 | `/system/bin`、`/data/service` 时可见时不可见 | 以探测为准，别凭印象 |
| COM-3 | 无容器 | 无 Docker/容器运行时 | 用进程级隔离替代 |
| COM-4 | ptrace 禁（共性） | 影响 C/C++、Node 附加调试等 | 走应用内/IPC 方案 |
| COM-5 | 假绿风险（共性） | HTTP 200、自检文案、采集盲区都可能骗人 | 反假绿三招 |
**配方**：设备观测四件套（日志/指标/截图/trace）+ `reverify.sh` 一键回归

---

## Slide 15 · 已解锁的关键配方（五条，可直接抄）
1. **执行门禁自救**：shdr → 本地重编译；`.codesign` → `strip + binary-sign-tool -selfSign 1`
2. **Vite 解锁**：社区 Go 1.24.5 → 本地编 esbuild → `ESBUILD_BINARY_PATH`（+ rollup→wasm-node）
3. **真机闭环**：无线 `hdc` + 复用 Studio 签名身份（离线解口令）→ 装机 → 启动 → **点击**
4. **观测剖析**：`hilog` + `hidumper` + `hitrace` + `hiprofiler` 插件
5. **质量门禁**：jsdom 真执行产物 + vitest/eslint/tsc + 量化阈值自检

## Slide 16 · 问题分级
- **P0 阻断**：签名证书、双根路径、env 缺失、执行门禁（无替代时）
- **P1 高摩擦**：Vite 解锁、SDK 拼装、无预置 JVM/真 Node、`/tmp` 只读
- **P2 可忍**：CLI 噪声、视野漂移、git 属主、`npx`
- **当前无解**：native 断点调试、core dump 事后分析 → ASAN 插桩 / 设备侧或 IDE 替代

## Slide 17 · 给生态的建议
- **平台（华为）**：放宽或文档化 ELF 门禁；补 SDK 缺件（`phone.json`）；提供鸿蒙 PC 版 CLT；hdc 免浏览器签名登录
- **社区**：为 npm 原生包补 ohos 平台键（esbuild/rollup）；把"本地编译 esbuild"配方纳入官方文档
- **开发者**：先判问题类别再动手；产物必须真执行；把可绕的坑固化成脚本基线

## Slide 18 · 行动项
1. `postrun-snapshot.sh`：一键采集【hilog + PSS/CPU + 截图 + trace】
2. 修三处"假绿/泄漏"：env 固化、sourcemap 剥离、自检输出数值+阈值
3. 冻结 `reverify.sh` 基线（8 场景一键回归）
4. M1：ArkTS 断点调试定案 / trace 可视化 / UI 用例化 / 压测

---
*配套：`HARMONYOS-PC-DEV-MAP.md`（策略与生态）、`BENCH.md`（Top8 证据）、`POSTRUN-PLAN.md`（后程规划）、真机截图与 trace 原始文件*
