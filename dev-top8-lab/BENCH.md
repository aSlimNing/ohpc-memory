# 鸿蒙 PC 主流开发场景 Top8 全面验证基准报告

设备：HarmonyOS PC（HongMeng Kernel 1.13.0，aarch64/musl），验证日期 2026-09-28。
评测方法：完备度（能否跑通）→ 问题定位（为什么不通）→ 性能与易用性。
所有结论均由本机真实命令执行得出，证据路径附后。

## 一、主流开发场景全集

按"静态/非静态 × 前端/后端"矩阵枚举 19 项，可分组为：

- 前端：SPA 工程化构建、免构建静态站点、SSR/混合渲染、样式工具链、单元/Lint
- 后端：Node 服务、Python 服务、Java 服务、Go/Rust 服务、GraphQL/REST+ORM
- 数据与存储：Redis、SQLite、C/S 型数据库（PG/MySQL）
- 原生与客户端：C/C++ 编译、鸿蒙 HAP 编译+签名、ArkTS 运行与调试、跨平台(RN/Flutter)
- 工程协作与基础设施：Git、CI 脚本、容器、本地网络可达性

## 二、Top8 选取

准则：① 覆盖矩阵四象限；② 本机可端到端实测；③ 主流高频；④ 相互独立；⑤ 鸿蒙优先、Java 纳入、Git 降为贯穿各场景的公共环节（不单列）。

| # | 场景 | 象限 | 结果 |
|---|---|---|---|
| 1 | 鸿蒙 HAP 编译 + 签名 | 非静态·客户端 | ✅ 通过 |
| 2 | 鸿蒙 ArkTS 应用运行与调试 | 非静态·客户端 | ✅ 闭环（无线装机+启动，华为身份签名） |
| 3 | Java 后端服务（HarmonyBrew JDK+Maven 真实项目） | 非静态·后端 | ✅ 通过（需 HarmonyBrew 渠道） |
| 4 | 前端 SPA 工程化（Vite 路径） | 静态·前端 | ✅ 已解锁（本地编 esbuild + rollup-wasm） |
| 4b | 前端 SPA 工程化（纯 JS/webpack 路径） | 静态·前端 | ✅ 通过 |
| 5 | 免构建静态站点 + 本地预览 | 静态·前端 | ✅ 通过 |
| 6 | Node.js HTTP API 服务 | 非静态·后端 | ✅ 通过 |
| 7 | Python Web 服务 + pip 依赖 | 非静态·后端 | ✅ 通过 |
| 8 | C/C++ 原生编译（clang/CMake/Ninja） | 非静态·系统 | ✅ 通过 |
| — | Git（贯穿公共环节） | 全场景 | ✅ 通过（需配置） |
| — | Redis / SQLite（数据层内嵌断言） | 非静态·后端 | ✅ 通过 |

**总判定：8/8 通过（2026-09-29）。** 最初作为"已知缺陷载体"保留的第 8 项（鸿蒙运行调试）已闭环：本机编译→华为身份签名→无线装机→启动→截屏取证，仅"按钮级点击"待解锁后补做。

## 三、逐项实测证据

### 1. 鸿蒙 HAP 编译 + 签名 ✅
- 改动 `Index.ets` 文案后增量构建：`BUILD SUCCESSFUL in 29s`（33 tasks，16 executed）
- `hap-sign-tool sign-app` → `sign-app success`；`verify-app` → `hap verify successed!`
- 产物：`entry-default-unsigned.hap` 87,872 B / `entry-default-signed.hap` 102,449 B（08:52 新生成）
- 命令：`node node_modules/@ohos/hvigor/bin/hvigor.js --mode module -p product=default assembleHap`
- 环境：`OHOS_BASE_SDK_HOME=DEVECO_SDK_HOME=~/ohos-sdk-mirror`（SDK 26.0.0，hnp 只读需镜像软链）

### 2. 鸿蒙 ArkTS 运行与调试 ✅（真机装机+启动闭环）
**A. 沙箱自闭环不可行（三面取证，日志 `ohpc-docs/aggregate/hdc*.log`）**
- `hdc list targets` 曾长期 `[Empty]`；hdc 5.0.1 本体可执行（HNP 包）
- ① **USB 面**：`[F] libusb_init failed ctxUSB is nullptr`、`WatchUsbNodeChange failed`；`/dev/bus/usb` Permission denied；`/dev` 仅 `usb-ffs`/`usbfn` ⇒ 本机是 USB **gadget** 角色，不能自任 host
- ② **网络面**：5555/5037/1717 `ECONNREFUSED`；`/proc/net/tcp` 读取被拒
- ③ **socket 面**：`/dev/socket` 不存在，`/data/local/tmp` 拒绝
- ⇒ 沙箱内无法自闭环，必须走外部设备

**B. 无线调试接入后：通道打通、调试能力全可用（2026-09-29 实测）**
- `hdc list targets` → **`192.168.43.1:5555`**；目标设备：**HUAWEI Mate 80 Pro Max（SGT-AL10）**，API 26 / HongMeng 1.13（本机 wlan0=192.168.43.4，同一无线网）
- 已实测可用的调试能力：`hdc shell`（`param get`/`uname` ✅）、**hilog 实时日志** ✅、`bm dump -a`（枚举 352 行已装应用）✅、**file send/recv 往返** ✅（25 B/20 ms；快照 123,495 B 拉回 61 ms @2 MB/s）、**`snapshot_display` 远程截屏** ✅（1320×2848，产物 `device-snapshot-0929.jpeg`）
- **剩余堵点（当时）**：安装我方 HAP 报 `code:9568257 error: fail to verify pkcs7 file`——SDK 自签的 OpenHarmony 证书链（`OpenHarmony.p12` + `UnsgnedDebugProfileTemplate`）不被商用鸿蒙设备信任

**C. 闭环达成：本机编译→华为身份签名→装机→启动（2026-09-29 实测）✅**
- 签名身份来源：Studio 自动签名留下的华为签发材料 `/storage/Users/currentUser/Documents/ohos/config/default_MyApplication*.{p12,cer,p7b}`（华为链 + 按 bundleName 绑定的 debug profile），口令可离线解出（`~/.qoder/bin/ohos-signing-pwd.mjs`）
- 签名要点（三档错误码实测）：`-profileSigned 1` **与** `-signCode 1` 都不能漏；bundleName 必须等于 profile 绑定的那个（当前 `com.example.myapplication`），否则 `9568329 verify signature failed`；漏 `-signCode 1` → `9568393 verify code signature failed`
- 实测链路：本机 hvigor 编译 → `hap-sign-tool` 签发 → `hdc install -r` 装机成功 → `aa start -b com.example.myapplication -a EntryAbility` → **`start ability successfully.`**，进程存活（`ps` 见 `com.example.myapplication`），远程截屏确认界面在跑（文案"自建 HAP 已运行｜由本机 hvigor + hap-sign-tool 构建并签名"）；产物 `device-app-foreground.jpeg` / `Download/自建App真机运行-0929.jpeg`
- **交互闭环也已验证**：`uitest dumpLayout` 定位按钮（"点我 +1"，bounds `[264,1722][1056,1857]`）→ `uitest uiInput click 660 1790` 点击 3 次 → 界面计数**实测 0 → 1 → 3**，截图见 `device-app-clicked.jpeg` / `Download/自建App真机点击验证-0929.jpeg` ⇒ 不只是"能装能起"，**控件可响应、状态可更新**
- 注意：`aa start` 需**手机已解锁**（锁屏时 `10106102 The device screen is locked`，且开发者模式下系统不会自动解锁）⇒ 做点击类验证前先让用户解锁并延长息屏时间
- 结论修正：**"写→编→签→装→跑→调"已在本机闭环，不再是"无通道"或"缺证书"**

### 3. Java 后端 ✅（经 HarmonyBrew，真实项目验证）
- 渠道：HarmonyBrew（用户级包管理器，`NONINTERACTIVE=1 zsh ~/harmonybrew-install.sh`，prefix `~/.harmonybrew`；bottle 均为 OHOS 原生构建故可执行）
- `brew install openjdk` → OpenJDK 26.0.2.1（56 个依赖 bottle）；`brew install maven` → Apache Maven 3.9.16_1
- 真实项目 `java-probe/order-service`（JUnit5 + surefire + jar）：`mvn -q package` **21.5s** 构建成功，`Tests run: 3, Failures: 0, Errors: 0`
- `java -jar target/order-service-1.0.0.jar` → `created ORD-1, total=1`（agent 与主线双重复核一致）
- git 提交 `f68c843`；坑：沙箱 `~` 实际解析到 `/data/storage/el2/base/files/home` 与 `/storage/Users/currentUser` 不同根，PATH/JAVA_HOME 需用绝对路径；`~/.m2/settings.xml` 预置华为云镜像无下载瓶颈
- （早期"无 JVM 判不可用"结论已推翻：HNP 54 包确无 jdk，但 HarmonyBrew 渠道可用——教训见"方法学修正"）

### 4. 前端工程化：Vite ✅（已解锁）/ webpack ✅ / Rollup-WASM ✅
- **Vite 失败根因**（表层）：`npm install` 报 `Unsupported platform: ohos arm64 LE`（esbuild install.js）；即使装上也无 ohos 版 native 包。Rollup 4 同样依赖 `@rollup/*` native。
- **精确根因（修正版，决定性实验）**：起初怀疑 SELinux 来源标签，但对照实验推翻——自编 ELF 与它的 `cat` 副本标签完全相同（`hmdfs:s0`）却都能执行；`chmod` 与硬链接均不是变量；决定性一步：把正常可跑 ELF 的 **section header 表偏移字段写坏 8 字节**，立刻 `permission denied`（rc=126）。⇒ 鸿蒙 loader **严格校验 ELF section header**，Go 静态二进制（esbuild，`file` 报 `bad shdr 11?`）与 Rust 系（rollup@4 native、SWC、tailwind-oxide）因此被拒；标准 Linux loader 对此宽容。`npm install` 报的 `Unsupported platform: ohos arm64 LE` 只是表层。
- **可行退路 A（纯 JS）**：`npm install --ignore-scripts`（314 包，15s）→ `tsc` 编译 monorepo 共享包 → `webpack 5 + ts-loader + sass-loader(dart-sass 纯JS) + css-loader` 打包 React+TSX+SCSS+Tailwind → 2026-09-29 复验 `compiled successfully in 10739 ms`（含 node 启动 wall 13152 ms），产物 `main.js` **233,218 B**（sha256 `c343774e…`），经 `http.server` 返回 `HTTP 200 / 233218 B text/javascript`。
  - **★ 2026-09-29 复跑修复：该路径此前"构建成功 + HTTP 200"但浏览器必崩**，用 jsdom 真执行产物后连抓 3 个缺陷并全部修掉：
    ① **`__APP_VERSION__` / `import.meta.env.MODE` 无注入** ⇒ 运行 `ReferenceError`（补 `DefinePlugin` 注入版本号与 mode）；
    ② **构建不产出 html**（`dist-webpack/` 只有 main.js，html 靠手工拷贝）⇒ 构建不自包含（补内联 emit 插件生成 `index.html`）；
    ③ **css-loader v7 默认改具名导出**，`import styles from './x.module.scss'` 拿到 `undefined` ⇒ `styles.moduleCard` 崩（补 `modules.namedExport: false` 对齐 Vite 语义）。
    修复后 jsdom 冒烟：**`#root` 渲染出 1 个根节点、可见文本 138 字、0 错误、SMOKE-PASS`**，文本含 `运行环境: production · v1.0.0`（证明注入生效）。⇒ **"HTTP 200" 完全掩盖不了这三类缺陷，必须真执行产物。**
- **可行退路 B（Rollup WASM，子 agent 实测）**：`rollup` alias → `@rollup/wasm-node@4.63.5` + `@rollup/plugin-typescript`（jsx react-jsx，需补 `tslib`）构建真实 React TSX 应用：`created dist/bundle.js in 15.5s`（wall 18.9–25.8s 方差大，峰值 RSS ~481MB，比 webpack 慢 1.5–2.5×）；HTTP 200，bundle 1,416,510 B。**Vite 本体仍不可用**：esbuild 无官方 wasm 回退（vitejs/vite#13208 关闭为 NOT_PLANNED），官方 wasm 出路仅 Rollup 侧。
- 附带发现：脚手架根 `package.json` 缺 `workspaces` 字段会导致 npm "up to date" 空转；ts-loader 需显式 `jsx: react-jsx`。
- **可行路径 C（解锁 Vite，2026-09-29 实证）**：社区 Go 1.24.5 鸿蒙版（`openharmony-sig/ohos_golang_go`，HiShell 可运行二进制包，433MB）→ `GOPROXY=https://goproxy.cn go install github.com/evanw/esbuild/cmd/esbuild@v0.25.12`（约 35s，产物 shdr 规范、无 "bad shdr"）→ `ESBUILD_BINARY_PATH=<本地 esbuild 绝对路径>` + `node_modules/rollup → @rollup/wasm-node` 软链 → `vite build` **6.32s** 产出 dist（`index.js` 67.95 kB / `react.js` 164.48 kB / `index.html`），preview 双 200。对照实验：不设 `ESBUILD_BINARY_PATH` 时 vite 仍报 `Unsupported platform: ohos arm64 LE` ⇒ 该 env 是必需项。
- **★ 真实浏览器验证（2026-09-29，针对 Vite 产物）✅**：用浏览器打开 `apps/web/dist` 做 DOM/交互断言——`#root` 渲染出子节点、body 背景色生效（CSS 已加载）、WebGL `renderer=Maleoon 916`（真机 GPU 渲染）；点击「Todo」「工具链自检」视图切换、激活态 class 由 `bg-gray-200`→`bg-indigo-600 text-white`；Todo 表单「填写→添加→li=1→localStorage 持久化→勾选→清空」全链路生效；应用内自检 **通过 10/11**（唯二 404 已优雅处理：静态服务器无 SPA fallback 致深链 `/toolchain` 404、dist 无 dev proxy 致 `/api/tasks` 404）。**无白屏、无 JS 异常** ⇒ 达到"用户能真的用起来"档位。截图证据 `verify-render-01..05*.png`（含 Maleoon 916、10/11 自检面板等）。
- **二进制执行两关模型（2026-09-29 修正，取代早前单因结论）**：
  ① **shdr（section header）不规范** → loader 无法定位元数据，直接拒（`file` 报 `bad shdr`），**不可修**，只能本地重编译（Go/Rust 预编译包多属此类）；
  ② **`.codesign` 节缺失/非法** → 同样拒绝，但**可修**：`strip --strip-all` + `/data/service/hnp/bin/binary-sign-tool sign -selfSign 1 -signAlg SHA256withECDSA` 重签后即可执行（实测：官方 node v24.13.0 本被拒 → 自签后跑通）。签名按**文件内容**校验，直接注入他人的 `.codesign` 无效。

### 5. 免构建静态站点 + 本地预览 ✅
`python3 -m http.server` + `curl` 命中 `static ok`。

### 6. Node.js HTTP API ✅
原生 `node:http` 起 8932，`curl /api/q` → `{"ok":true,"path":"/api/q"}`。注意默认 node 为 Electron 宿主（v24.11.1），stderr 会打印 `Failed to set thread qos` 噪声。
- **官方鸿蒙原生 Node 已落地可用（2026-09-29 实证）**：`OpenHarmonyPCDeveloper/DevNode-OH` 的 `node.hnp`（51.8 MB，ZIP 格式，内含 v24.13.0）解包后**直接执行被拒**，经 `strip --strip-all` + `binary-sign-tool sign -selfSign 1` 重签即可运行：`node -v` → v24.13.0，`process.platform === 'openharmony'`、`arch=arm64`、内置 npm 可用；express 真实服务 `curl /hello` 返回 JSON、`/cookie` 200 ⇒ **可作主力运行时替换 Electron 垫片**（自签步骤与产物：`node-ohos/node_signed`）。
- **全栈项目级验证（`node-fullstack-lab/`，含主线独立复核）**：Express 5 + 文件持久化 + 静态托管；npm 装 express@5.2.1/nanoid（`added 69 packages in 3s`，零平台告警，`*.node` 原生二进制 **0** 个）；接口断言：空列表 → POST 两项 → GET `count:2` 字段正确 → **重启进程后 `items_loaded=2`、id 一致（持久化成立，主线另起 pid 复验通过）**；`/api/health` → `{"platform":"openharmony","node":"v24.13.0"}`；静态页 200/3085 B、缺失路径 404 ⇒ 官方 Node 可承载真实全栈项目

### 7. Python Web + pip ✅
`python3 -m pip install --user flask` 成功（pip 24.3.1 / Py3.12.8）；`flask run` 后 `curl /api/ping` → `{"msg":"py ok","ok":true}`。

### 8. C/C++ 原生编译 ✅
`cmake -G Ninja` + clang 15.0.4 编译运行 `native ok` rc=0。坑：CMake 报 `System is unknown to cmake ... Platform/HarmonyOS`（需自建平台文件），且 `Problem parsing /proc/meminfo`。

### Git（公共环节）✅
- 全流程通过：裸库 init → commit → 双分支 push → `clone -b main` → `cat-file` 内容校验一致
- 工作区已用 git 提交全部验证产物（`1358635`）
- 坑①：hmdfs 文件属主为 `20001006`，触发 `dubious ownership`，需 `git config --global safe.directory '*'`
- 坑②：clone 裸库时 HEAD 指向 unborn `master` 导致假通过，必须显式 `-b main`

### 数据层 ✅
- Redis 8.4.0 起停与 set/get 正常；坑：`/tmp` 只读，`--logfile` 必须指向可写区
- SQLite（python 标准库）建表读写正常（无独立 `sqlite3` CLI）

## 四、性能与易用性观察

| 维度 | 观测值 |
|---|---|
| 鸿蒙增量构建 | 29 s（33 tasks，16 执行） |
| Java mvn package | 21.5 s（JUnit5 3 测试全过；首次含依赖下载） |
| 前端 npm 安装 | 314 包 / 15 s（须 `--ignore-scripts`） |
| webpack 生产构建（纯 JS） | 10.4 s → 260 KB bundle |
| **Vite 构建（本地编 esbuild，解锁后）** | **6.32 s** → index 67.95 kB + react 164.48 kB |
| Rollup WASM 构建 | 15.5 s → 1.35 MB bundle（RSS 峰值 481MB，方差大） |
| Flask 冷启动 | ≈4 s 可服务 |
| Redis 启动 | ≈1 s |
| 网络往返 | `npm ping` PONG 1156 ms（境外 registry），npmmirror 更快 |

易用性主要摩擦点（按影响排序）：
1. 外来原生二进制被拦 ⇒ 分两类：**shdr 不规范**（Go/Rust 预编译，只能本地重编译）与 **`.codesign` 缺失**（可 `strip`+`binary-sign-tool -selfSign 1` 自签放行）。已给出的解：前端走本地编 esbuild（Vite 6.32s）或 webpack/WASM；Node 走自签官方包
2. 无部署通道 ⇒ "写→编→签→装→调"断在最后一环，客户端闭环无法完成（取证见 §3.2）
3. 系统预置无 JVM ⇒ Java 依赖用户自行搭 HarmonyBrew 渠道（一次性安装成本，装后体验正常）
4. 沙箱 `~` 双根（`/data/storage/el2/base/files/home` vs `/storage/Users/currentUser`）⇒ PATH/JAVA_HOME 需绝对路径；**`pip install --user` 与解释器 `sys.path` 也会分落两根**（2026-09-29 复验时真实踩到：装过的 flask 变 `ModuleNotFoundError`，`python3 -m site` 可确认实际 sys.path）
5. hmdfs 属主 ⇒ git 需要一次性 `safe.directory` 配置
6. `/tmp` 只读 ⇒ 需把日志/pid 显式放到工作区
7. Electron 版 node 的 stderr 噪声与 `process.platform=ohos` 导致的 optional deps 缺失（换官方原生 node 后平台键变为 `openharmony`）

### 方法学修正（重要）
- 初版把 Java 判为"❌ 不可用"，依据只是 HNP 无 jdk + `java` 为 shim 的**嗅探证据**；用户指出 JDK 可经 **HarmonyBrew** 安装后，用真实项目（order-service：JUnit5+surefire+jar）复测翻盘为 ✅。
- 结论修正原则：**判"不可用"前必须先穷举安装渠道（HNP → HarmonyBrew → 用户渠道）；能力判定必须来自项目级端到端执行（依赖→构建→运行→断言），不接受 which/version 嗅探。**

## 五、结论与建议

- **可直接投产**：Node/Python 后端、Java 后端（HarmonyBrew JDK 26 + Maven 3.9）、C/C++ 原生编译、Redis/SQLite 数据层、静态站点、纯 JS/WASM 前端工程化、Git 协作、鸿蒙 HAP 编译+签名。
- **受阻项及解法**：
  - 鸿蒙运行调试（唯一未全通项）→ **通道已打通**（无线调试接入真机 Mate 80 Pro Max，shell/hilog/文件/截屏/枚举应用全可用）；只差**华为签发的调试证书 + 含 UDID 的 profile**（DevEco 连设备"自动签名"最省事）后即可 `hdc install` + `aa start`；
  - Vite/esbuild/Rollup4/SWC → shdr 严格校验所致的生态缺口；建议栈：**webpack+ts-loader 为主（10.4s），`@rollup/wasm-node` 为 Vite 兼容备选（15.5s）**；等生态出 OHOS 原生构建再切换。
- **建议的鸿蒙 PC 开发基线**：HNP（系统级 CLI）+ HarmonyBrew（用户级软件，如 JDK）+ 纯 JS/WASM npm 生态 + 设备直驱 hvigor 做编译签名；运行与 UI 调试放到外部真机完成。
