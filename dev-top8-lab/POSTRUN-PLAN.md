# 后程能力规划：调试 / 剖析 / 测试 / 可观测性（全场景）

> 上半场（2026-09-29）：**写→编→签→装→跑** 八条线全部打通（见 `BENCH.md`，8/8）。
> 本文规划**下半场**——代码跑起来之后的：断点调试、性能剖析、内存/资源观测、自动化测试与回归门禁。
> 范围：不限于鸿蒙开发，八条线全场景。所有"✅ 已验"均附本轮真实命令与输出。

## 一、能力现状总表（实测）

| 线 | 后程能力 | 状态 | 实测证据 |
|---|---|---|---|
| 鸿蒙 App | 日志抓取 | ✅ | `hdc shell hilog -x` 实时日志流 |
| 鸿蒙 App | 界面取证 | ✅ | `snapshot_display`（1320×2848）、`uitest screenCap` |
| 鸿蒙 App | UI 自动化/交互 | ✅ | `uitest dumpLayout` + `uiInput click`，计数 **0→3** |
| 鸿蒙 App | 进程/内存指标 | ✅ | `hidumper --mem 46599` → **Pss Total 24,281 kB** |
| 鸿蒙 App | 系统 CPU/负载 | ✅ | `hidumper --cpuusage` → **Total 16.96%**，load 14.4/15.4/15.3 |
| 鸿蒙 App | Trace 采集 | ✅ | `hitrace -t 3 -o …` → 拉回主机 **279,214 B**（1.8 MB/s） |
| 鸿蒙 App | 剖析插件（后端） | ✅ | `hiprofiler_cmd -s -l` → cpu / **gpu** / memory / network / diskio / ftrace / hiperf / hilog / hisysevent / hidump 插件齐备 |
| 鸿蒙 App | 端口转发（调试器通道） | ✅ | `hdc fport tcp:9229 tcp:9229` → `Forwardport result:OK` |
| 鸿蒙 App | 断点调试 | ⏳ 待验 | `aa attach` / `aa test` 命令在；ArkTS debugger 客户端待定（DevEco 承载 or 自建协议客户端） |
| Web 前端 | 浏览器内诊断 | ✅ | console **0 条**（另注入 marker 自证采集通道有效，排除假绿）、network **6/6 200**、DCL **116 ms** / load **117 ms**、11 项自检全过 |
| Web 前端 | 产物真执行校验 | ✅ | jsdom 执行 bundle：0 错误、渲染 138 字 |
| Web 前端 | 单测 / Lint / 类型检查 | ✅ | **vitest 3 文件 10 用例全过 / 6.5 s**；`tsc -b --force` **0 错**；`eslint .` **0 error 0 warning** |
| Web 前端 | 产物完整性 | ✅ | 7 文件 1,268,956 B；index.html 引用全部存在且 >0；HTTP 6/6 200（含负控 404）；shipped js/css 占位符 **0 命中** |
| Web 前端 | ⚠️ sourcemap 信息暴露 | ⚠️ | `.map` 内仍含 `__APP_VERSION__`(1) / `import.meta.env`(1) / `process.env.NODE_ENV`(2) 的**未替换源码原文** ⇒ 对外发布前应关闭 sourcemap 或剥离 |
| Node 后端 | CPU 剖析 | ✅ | `node --cpu-prof` → 产出 `*.cpuprofile` |
| Node 后端 | 调试器/堆剖析 | ✅ 工具在 | `--inspect` / `--inspect-brk` / `--heap-prof` / `--prof` / `--trace-event` |
| Java 后端 | 进程诊断 | ✅ | `jps` 命中；`jcmd VM.version`、**`jstack` 19 线程**、`jcmd GC.heap_info` |
| Java 后端 | 录制/断点 | ✅ 工具在 | `jfr` / `jmap` / `jstat` / `jdb`（JDK 全诊断套件） |
| Python | 交互式调试 | ✅ | `python3 -m pdb` 真断点命中 |
| Python | 性能剖析 | ✅ | `cProfile` + `pstats` 出 cumtime 统计 |
| C/C++ | 内存/越界检测 | ✅ | ASAN 捕获 `heap-buffer-overflow`（含源码行） |
| C/C++ | 泄漏检测 | ❌ | `LeakSanitizer: detect_leaks is not supported on this platform` |
| C/C++ | 交互式断点调试 | ❌ | `gdb`→`ptrace: Permission denied`；`lldb`→`'A' packet error` |
| C/C++ | Core dump 事后分析 | ❌ | `core_pattern=/core-%T-%E`（只读根，落不到工作区） |
| 数据层 | Redis 观测 | ✅ | `INFO server`(8.4.0)、`slowlog len`、`dbsize` |
| 数据层 | SQL 调优 | ✅ | `EXPLAIN QUERY PLAN`：`SCAN t` → 建索引后 `SEARCH t USING INDEX ia` |
| 公共 | 版本管理 | ✅ | git 全流程 + 贯穿各场景提交 |
| 公共 | 负载/压测 | ⏳ 未做 | 无 ab/wrk，需自写（node/python 脚本） |

## 二、分档路线（M0 立即可用 → M2 需外部条件）

**M0：零新增依赖，今天就能干活**
0. 固化环境：把 `ESBUILD_BINARY_PATH`（指向本地编译的 esbuild）写进前端 `test`/`build` 脚本 —— **否则 `npm test` 裸跑必失败**（已实测）
1. 鸿蒙观测三件套：`hilog`（日志）+ `hidumper`（内存/CPU）+ `snapshot_display`（界面）
2. 鸿蒙 trace：`hitrace` 采集 → 拉回主机（**验收**：能产出 ≥100KB trace 并可被解析工具打开）
3. UI 自动化：`uitest dumpLayout` / `uiInput` / `uRecord` 录制回放（**验收**：能对指定控件做"点击→断言状态变化"用例）
4. 各语言剖析：Java `jcmd/jstack/jfr`、Python `cProfile`、Node `--cpu-prof`（**验收**：每个都能对活进程产出可读指标）
5. 原生静态检测：ASAN/UBSAN 编进构建（**验收**：故意越界能被抓到且指出源码行）
6. 数据层调优：Redis `slowlog`、SQLite `EXPLAIN QUERY PLAN`（**验收**：能给出"加索引前/后"对比）

**M1：补一个客户端/脚本即可闭环**
1. **ArkTS 断点调试**：优先确认 DevEco 是否可"只用其 debugger、不用其构建"（我们构建已自持）；备选自建 CDP/DAP 客户端连 `aa attach` 暴露的调试端口（**验收**：能在我方代码某行停下并读到变量）
2. **Trace 可视化**：主机侧用 Perfetto UI / catapult 打开 `.ftrace`（**验收**：能看到我方 App 的帧与线程时间线）
3. **压测**：node/python 写并发脚本打我方 API（**验收**：给出 QPS/P95 曲线）
4. **测试门禁**：vitest + eslint + tsc 进 git hook / 脚本（**验收**：任一失败即阻断提交）
5. **Node 连调**：`--inspect` + CDP 客户端（**验收**：能在断点看调用栈）

**M2：需设备/账号/权限条件**
1. **真机 native 崩溃分析**：push `lldb-server` 到设备 + `hdc fport` 接入（依赖设备允许 ptrace，零售机未知）
2. **DevEco Profiler / SmartPerf 图形化**：`sp_daemon` 在本机不存在，需 Studio 侧；命令行可用 `hiprofiler_cmd` 自定义采集替代
3. **CI 全自动回归**：装机→启动→uitest 用例→截图比对→hilog 断言，串成流水线（**验收**：一条命令跑完并输出通过率）

## 三、阻塞点与解法（按"能不能绕过"分类）

| 阻塞点 | 现状 | 影响 | 解法 |
|---|---|---|---|
| 沙箱禁 `ptrace` | gdb/lldb 无法调试本地进程 | C/C++ 断点调试 | ① ASAN/UBSAN 插桩替代；② 需断点时在设备侧或让用户用 Studio 调试 |
| `core_pattern=/core-%T-%E` | 崩溃不留 core 到工作区 | 事后分析 | 用 ASAN 日志 + `hilog` + 应用内信号处理器落盘栈 |
| LeakSanitizer 不支持 | 无自动泄漏检测 | 内存泄漏 | `--heap-prof`(Node) / `jcmd GC.heap_info`(Java) / `hiprofiler memory-plugin`(鸿蒙) 组合替代 |
| ArkTS debugger 客户端缺位 | 无 DevEco 时不知怎么连 | 断点调试 | 先验证 `aa attach` 暴露的端口+协议；必要时让用户借 Studio 做"仅调试" |
| `sp_daemon` 不在零售机 | SmartPerf 用不了 | 图形化性能曲线 | 走 `hitrace` + `hiprofiler_cmd` 命令行采集 |
| 设备锁屏 | `aa start` 失败 | 自动化回归 | 用例前置检查解锁态；或改测"装机+进程存活+日志"这类不需前台的断言 |
| `npm test` 也需 `ESBUILD_BINARY_PATH` | 裸跑 `npm test` 报 `Unsupported platform: ohos arm64 LE`（vitest 用 esbuild 打包 vite 配置） | 前端测试门禁 | 把该 env 固化进 npm test/build 脚本（**现状：手动 export 才行**） |
| MCP 浏览器网络列表不完备 | 服务端日志有 `404 /favicon.ico`，`list_network_requests` 未列出 | 判"无失败请求"会误判 | 结论以服务端日志为准 + 加"负控请求"验证采集有效性 |
| 应用自检存在"文案与数值矛盾"的假绿 | `polling` 项实测 3×100 ms tick 耗 **2890 ms**，文案却写"精度正常"，仅因阈值 <3000 ms 才 pass | 自检可信度 | 自检项必须同时输出**量化值与阈值**，禁止只给结论性文案 |

## 四、建议的下一步（按性价比排序）

1. **M0 打包成一条命令**：`postrun-snapshot.sh` —— 同时产出：我方 App 的 hilog 过滤日志、PSS/CPU 指标、界面截图、3 秒 trace，落盘归档。一次采集，四类证据。
2. **修三个已发现的"假绿/盲区"**：① 前端 test/build 脚本固化 `ESBUILD_BINARY_PATH`；② sourcemap 对外发布前剥离；③ 应用自检项输出量化值+阈值（`polling` 那类文案与数字矛盾的必须改）。
3. **UI 用例化**：把"点击→计数变化"扩成 3~5 条真实用例（启动、交互、异常、返回），失败即报错——这是回归门禁的雏形。
4. **Trace 可视化打通**：确认主机侧能打开 `.ftrace`（Perfetto），否则整套 trace 只是二进制。
5. **ArkTS 断点调试可行性定案**：这是唯一"完全没验过"的高价值项，值得单独一轮探索（含是否必须依赖 DevEco）。

---
*生成于 2026-09-29；证据可复跑：`dev-top8-lab/postrun-lab/`（本文件同目录），主机侧脚本与设备侧命令均在本仓库。*
