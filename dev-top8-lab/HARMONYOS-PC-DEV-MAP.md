# 鸿蒙 PC 开发能力作战地图与验证总结

> 范围：主流开发场景（前端/后端/原生/数据/工程协作）× 鸿蒙 PC（含真机协同）
> 依据：2026-09-28 ~ 09-29 两日实测，全部结论附原始输出与可复跑命令
> 配套：`BENCH.md`（Top8 基准，8/8）、`POSTRUN-PLAN.md`（后程规划）、`reverify*.log`（原始日志）

---

## 一、作战地图：鸿蒙 PC 的平台策略与生态现状

### 1.1 系统底座

| 维度 | 实况 |
|---|---|
| 内核/架构 | HongMeng Kernel 1.13.0，aarch64，**musl**（无 glibc） |
| SDK | OHOS SDK 26.0.0.18（API 26），以 HNP 形式提供且只读 |
| 用户文件系统 | hmdfs：`/storage/Users/currentUser` ↔ `/data/storage/el2/base/files/home` **双根** |
| 只读面 | `/tmp` 只读；`core_pattern=/core-%T-%E`（根目录只读，core 落不到工作区） |
| 可见性 | `/system/bin`、`/data/service` 根目录不可列（可穿越）；应用沙箱互不可见 |

### 1.2 平台策略（理解这四条，就理解了 80% 的"为什么不行"）

**① 沙箱隔离策略**：应用/IDE 各自有私有沙箱，工具链**零共享**。DevEco Studio（鸿蒙版）已装但本体在 HAP 沙箱内，外部 CLI 探测不到 ⇒ 想用 IDE 的能力必须让**用户本人**在 IDE 里操作，或另找命令行替代。

**② 二进制执行门禁（两关，实测模型）**
| 关卡 | 触发条件 | 可否自救 |
|---|---|---|
| shdr（section header）不规范 | Go/Rust 预编译包常见（`file` 报 `bad shdr`） | ❌ 不可修，只能**本地重编译** |
| `.codesign` 缺失/非法 | 外部下载的 OHOS 构建件 | ✅ `strip --strip-all` + `binary-sign-tool sign -selfSign 1` 自签放行 |

> 判据提示：标签（SELinux）、`chmod`、硬链接**都不是**判据；把正常 ELF 的 shdr 写坏 8 字节即可复现拒绝。

**③ 包管理三层策略**
| 层 | 渠道 | 内容 | 特点 |
|---|---|---|---|
| 系统级 | **HNP**（`/data/service/hnp`） | clang/LLVM、Python 3.12、Perl/Ruby、Redis、git、hdc、SDK（54 包） | 有签名体系，**装完即在 PATH**；安装走系统渠道（用户可自行装） |
| 用户级 | **HarmonyBrew**（`~/.harmonybrew`） | 毕昇 JDK、Maven、Node 等 56 bottle | bottle 为 OHOS 原生构建；`NONINTERACTIVE=1 zsh ~/harmonybrew-install.sh` |
| 语言级 | npm / pip | 纯 JS、纯 Python 包 | **原生依赖包会踩门禁②**，需本地重编译或自签 |

**④ 部署与签名策略**：编译产物上真机要过**华为签名门禁**（零售机只认华为签发证书+按 bundleName 绑定的 profile）。
三档错误码实测：`9568257 fail to verify pkcs7`（用了 OHOS 测试证书）/ `9568329 verify signature failed`（bundleName 与 profile 不符）/ `9568393 verify code signature failed`（漏 `-signCode 1`）。
可行身份：**Studio 自动签名材料可离线复用**（口令可由 `~/.qoder/bin/ohos-signing-pwd.mjs` 解出）。

### 1.3 三方生态现状（分档）

| 档位 | 生态 |
|---|---|
| **成熟**（开箱可用） | C/C++ 全链（clang 15 + LLVM + CMake 4.1 + Ninja + gdb/lldb）、Python 3.12、Perl/Ruby、Git、Redis 8.4、SQLite、hdc、vim/nvim、官方 Node 24.13（HNP/自签）、Java（HarmonyBrew 毕昇） |
| **半可用**（需技巧） | 前端 native 链（esbuild/rollup-native/SWC：本地重编译或 WASM 替代）、Rust/Go（需社区 OHOS 版工具链）、Go 编译产物 |
| **缺口** | DevEco 命令行工具链（官方 CLT 只有 Win/macOS/Linux-x64×64，**无鸿蒙 PC 版**；`devecocli signature generate` 需浏览器登录，沙箱内失败）、`sp_daemon`（SmartPerf 数据源，零售机无）、图形化 Profiler（依赖 Studio）、容器（无 Docker） |
| **官方生态入口** | gitcode `OpenHarmonyPCDeveloper`：docs（移植指南/混合开发实战）、DevNode-OH（Node HNP）、毕昇 JDK HNP、Rust/Go 工具链——**缺什么先来这里找** |

---

## 二、本次验证策略

### 2.1 框架与选取

- **评测框架（用户定义，顺序固定）**：完备度 → 有无问题 → 性能与易用性
- **场景全集 19 项 → Top8**，选取准则：矩阵全覆盖（静态/非静态 × 前端/后端）+ 本机可端到端实测 + 主流高频 + 相互独立
- **优先级**（用户指定）：鸿蒙最高 > Java 重要 > Git 不单列（作为每场景的公共环节）

### 2.2 三条铁律（本次验证的方法论内核）

1. **项目级真实测试**：每个场景都建真实工程走「依赖 → 构建 → 运行 → 断言」，不接受 `which/ls` 嗅探式结论
2. **产物必须真执行**：HTTP 200 一律不算通过 —— 用 jsdom / 真实浏览器 / 真机点击来验证"能不能用"（此规矩当天抓出 3 个"构建绿、运行必崩"的缺陷）
3. **判"不可用"前穷举渠道**：HNP → HarmonyBrew → 用户渠道 → 本地自建；Java 与前端两条线都因这条规矩从 ❌ 翻成 ✅

### 2.3 覆盖的路径（三层）

| 层 | 覆盖内容 | 证据形态 |
|---|---|---|
| **主机侧（沙箱内）** | 8 条场景线 + 数据层 + Git；源码→构建→产物 | 构建日志、产物字节数、curl 响应 |
| **设备侧（无线 hdc 真机）** | 编译→签名→装机→启动→**点击**→日志→截图 | `aa start successfully`、计数 0→3、截图、hilog、trace |
| **后程（运行之后）** | 调试 / 剖析 / 测试 / 可观测性（全 8 线） | trace 文件、jstack/jcmd、PSS/CPU、单测通过率 |

### 2.4 执行方式

多线并行（子 agent）+ 主线抽查复核（防"假绿"）+ 每项结论附可复跑命令（`reverify.sh`）。

---

## 三、分语言/场景：定性结论 · 实况 · 问题

### 3.1 鸿蒙 ArkTS / HAP —— ✅ 全链路闭环（含真机交互）

- **实况**：改码增量编译 **29 s**（28 tasks/11 executed）→ `sign-app success` → `hap verify successed!`（产物 102,448 B）→ `hdc install` 装机 → `aa start` → UI 计数 **0→3**（uitest 点击）→ 截图取证
- **关键配方**：设备端直驱 hvigor（不依赖 Studio）+ 华为签名身份复用（studio 材料 + 离线解密口令）+ `-profileSigned 1 -signCode 1`
- **问题**：① profile 绑定 bundleName，换包名需 Studio 重签；② `aa start` 需设备解锁；③ 本机 SDK 缺 `phone.json` 需手补；④ 断点调试尚无 CLI 客户端

### 3.2 C/C++ —— ✅ 编译运行；⚠️ 交互调试受限

- **实况**：clang 15 + CMake/Ninja 出 `native ok` rc=0（直连 clang 299 ms vs cmake+ninja 1,959 ms，产物同为 18,816 B）；**ASAN 抓到 heap-buffer-overflow 并指出源码行**
- **问题**：① 沙箱禁 `ptrace` ⇒ gdb/lldb **无法断点调试**；② core dump 写只读根 ⇒ 无事后分析；③ LeakSanitizer 不支持
- **绕法**：ASAN/UBSAN 插桩 + 应用内信号处理落盘 + 设备侧或 Studio 调试

### 3.3 Java —— ✅ 生产可用（经 HarmonyBrew）

- **实况**：JDK 26.0.2.1 + Maven 3.9.16；`mvn package` **21.5 s**，JUnit **3/3 通过**，`java -jar` → `created ORD-1, total=1`；后程诊断 **jps/jcmd/jstack(19 线程)/GC.heap_info/jfr** 齐全
- **问题**：系统预置无 JVM，需用户搭渠道（HarmonyBrew 或毕昇 JDK HNP）

### 3.4 Node.js —— ✅ 双形态可用

- **实况**：Electron 垫片 v24.11.1（立即可用）+ **官方鸿蒙原生 Node 24.13**（自签后可跑，`process.platform=openharmony`）；Express 5 全栈项目：69 包 **3 s** 装完、接口断言通过、**重启后数据持久化**；`--cpu-prof` 真产出 `.cpuprofile`
- **问题**：① npm 生态不认 `ohos/openharmony` 平台键（esbuild 等原生包缺装）；② `npx` 不可用；③ 沙箱 `~` 双根导致 pip/npm 缓存错位

### 3.5 Python —— ✅ 生产可用

- **实况**：Python 3.12.8 + pip 24.3.1 + Flask 3.1.3（`{"msg":"py ok","ok":true}`）；后程 **pdb 真断点命中**、cProfile+pstats 出统计
- **问题**：`pip install --user` 与解释器 `sys.path` 可能落在**不同根**（表现为"装过却 ModuleNotFoundError"）⇒ 解法：工程内 `--target` + 显式 `PYTHONPATH`

### 3.6 Web 前端 —— ✅ 已解锁（三条路径）

| 路径 | 实况 | 备注 |
|---|---|---|
| Vite（原生 esbuild） | **6.4 s** → dist，preview 200，浏览器真渲染+真交互 | 需 `ESBUILD_BINARY_PATH` 指向**本地编译**的 esbuild |
| webpack（纯 JS） | 10.4–11.5 s → 233 KB bundle，jsdom 冒烟 0 错误 | 修了 3 个运行期缺陷（注入/html/CSS Modules） |
| Rollup WASM | 15.5 s → 1.35 MB | 慢 1.5–2.5×，作后备 |

- **后程**：vitest **10/10 通过（6.5 s）**、`tsc -b --force` 0 错、`eslint` 0 error 0 warning、浏览器 console 0 条、network 6/6 200、DCL 116 ms
- **问题**：① 裸跑 `npm test`/`vite build` 失败（须 env）；② **sourcemap 泄漏未替换源码**；③ 生态原生包无 ohos 构建（需本地编译）

### 3.7 数据层与工程协作 —— ✅

- Redis 8.4.0（INFO/slowlog/dbsize）；SQLite `EXPLAIN QUERY PLAN`（`SCAN t` → 建索引 `SEARCH ... USING INDEX`）
- Git 全流程（含裸库推拉）；坑：hmdfs 属主触发 `dubious ownership`

### 3.8 跨线公共结论

**能**：写码 → 构建 → 签名 → 装机 → 启动 → 交互 → 日志/截图/指标/trace 采集 → 单测/lint/类型检查
**不能（或需绕）**：沙箱内 native 断点调试、core dump 事后分析、图形化 Profiler、容器、无浏览器时的 devecocli 登录

---

## 四、下一步工作重点

### 4.1 立即做（M0，零新依赖，当天可验收）

1. **一键采集脚本** `postrun-snapshot.sh`：一次运行产出【我方 App 的 hilog 日志 + PSS/CPU 指标 + 界面截图 + 3 s trace】四类证据
2. **修三个已发现的"假绿/泄漏"**：前端 test/build 脚本固化 `ESBUILD_BINARY_PATH`；发布前剥离 sourcemap；自检项输出量化值+阈值
3. **把已验证路径冻结成基线**：`reverify.sh`（8 场景全量复跑）+ 真机链路脚本（装机→启动→点击断言），任何改动后一键回归

### 4.2 短期（M1，需补一个客户端/脚本）

1. **ArkTS 断点调试定案**（唯一完全未验的高价值项）：确认 `aa attach` 暴露的端口与协议，或"借 Studio 仅做调试"
2. **Trace 可视化**：Perfetto 打开 `.ftrace`（否则 trace 只是二进制）
3. **UI 用例化**：把"点击→计数"扩成 3~5 条用例（启动/交互/异常/返回），失败即红 ⇒ 回归门禁雏形
4. **压测**：node/python 并发脚本打 API，产出 QPS/P95

### 4.3 中期（M2，需外部条件）

1. **CI 全自动真机回归**：装机 → 启动 → uitest 用例 → 截图比对 → hilog 断言，一条命令出通过率
2. **构建产物安全**：sourcemap 策略、签名身份管理、依赖来源审计
3. **生态反哺**：把本地编译 esbuild 的配方贡献给 OpenHarmonyPCDeveloper；跟进 Node 回合主社区后的 ohos 平台键适配

### 4.4 如何做得更好（方法论沉淀）

- **证据分层**：源码级（构建日志）→ 产物级（真执行）→ 设备级（真机点击）→ 量化级（阈值断言）。缺一层就可能假绿
- **反假绿三招**：注入 marker 自证采集通道有效；加负控（故意 404/失败请求）；自检必须打印数值与阈值
- **并行 + 抽查**：独立线并行跑 agent，主 agent 必须抽查关键产物（sha256/字节数/行为契约），不采信"完成"报告
- **可复跑优先**：结论必须附命令与原始输出，报告数字过期就重测，不引用旧结论

---
*文档：`dev-top8-lab/HARMONYOS-PC-DEV-MAP.md`｜配套：`BENCH.md`、`POSTRUN-PLAN.md`、`reverify.sh`、`reverify-final.log`*
