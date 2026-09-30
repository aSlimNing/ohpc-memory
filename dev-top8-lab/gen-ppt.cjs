const PptxGenJS = require('pptxgenjs');
const p = new PptxGenJS();
p.defineLayout({ name:'W', width:13.33, height:7.5 });
p.layout = 'W';

const BG='0D1117', FG='E6EDF3', MUT='8B949E', OK='3FB950', BAD='F85149', ACC='58A6FF', CARD='161B22';
p.theme = { background:{ color:BG } };

function slide(title){
  const s = p.addSlide();
  s.background = { color: BG };
  if(title){
    s.addShape('rect',{x:0.5,y:0.45,w:0.12,h:0.55,fill:{color:OK}});
    s.addText(title,{x:0.75,y:0.4,w:11.8,h:0.7,fontSize:26,bold:true,color:FG});
  }
  s.addText([{text:'',options:{}}],{});
  return s;
}
function cards(s, items, cols=2){
  const w=(12.3-(cols-1)*0.3)/cols, h=2.3, rows=Math.ceil(items.length/cols);
  items.forEach((it,i)=>{
    const r=Math.floor(i/cols), c=i%cols;
    const x=0.5+c*(w+0.3), y=1.5+r*(h+0.3);
    s.addShape('roundRect',{x,y,w,h,rectRadius:0.08,fill:{color:CARD},line:{color:'30363D',width:1}});
    s.addText([{text:(it.s||'')+' ',options:{color:it.sc,bold:true}},{text:it.t,options:{color:FG}}],
      {x:x+0.2,y:y+0.15,w:w-0.4,h:h-0.3,fontSize:14,lineSpacingMultiple:1.25,valign:'top'});
  });
}
function table(s, rows, widths){
  s.addTable(rows,{x:0.6,y:1.5,w:12.1,colW:widths,fontSize:14,color:FG,border:{color:'30363D',pt:0.75},
    headerRow:true,valign:'middle',rowH:0.5});
}
function bullets(s, items, y=1.5){
  s.addText(items.map(t=>({text:t,options:{bullet:{code:'25AA',color:ACC},color:FG,breakLine:true}})),
    {x:0.8,y,w:11.8,h:5.2,fontSize:18,lineSpacingMultiple:1.7,valign:'top'});
}

// 1 封面
{
  const s=slide();
  s.addText('鸿蒙 PC 主流开发场景\nTop8 全面验证基准',{x:0.8,y:2.1,w:11.7,h:2.2,fontSize:40,bold:true,color:FG});
  s.addText('HarmonyOS PC · HongMeng Kernel 1.13 · aarch64/musl · 2026-09-28\n评测框架：完备度 → 问题定位 → 性能与易用性 · 全部结论来自项目级真实测试',
    {x:0.8,y:4.6,w:11.7,h:1.2,fontSize:16,color:MUT});
}
// 2 方法
{
  const s=slide('方法：19 项场景全集 → Top8');
  bullets(s,[
    '全集按「静态/非静态 × 前端/后端」矩阵分 5 组 19 项',
    '选取准则：矩阵全覆盖 · 本机可端到端实测 · 主流高频 · 鸿蒙优先',
    'Git 不单列——作为公共环节贯穿每场景；Redis/SQLite 内嵌为数据层断言',
    '每个场景 = 真实工程：依赖安装 → 构建 → 运行 → 可复核产物',
    '教训：Java 曾被"嗅探"误判为不可用，HarmonyBrew 补装后真实项目复测翻绿',
  ]);
}
// 3 总览
{
  const s=slide('结果总览：7 / 8 通过');
  const g={color:OK,bold:true}, r={color:BAD,bold:true};
  table(s,[
    [{text:'#',options:{bold:true,color:MUT}},{text:'场景',options:{bold:true,color:MUT}},{text:'象限',options:{bold:true,color:MUT}},{text:'结果',options:{bold:true,color:MUT}}],
    ['1',{text:'鸿蒙 HAP 编译+签名',options:{}},'非静态·客户端',{text:'✅ 29s 构建，sign/verify 双过',options:g}],
    ['2','鸿蒙 ArkTS 运行调试','非静态·客户端',{text:'❌ 无部署通道（预期内）',options:r}],
    ['3','Java 后端','非静态·后端',{text:'✅ JDK26+Maven，测试 3/3',options:g}],
    ['4','前端 SPA','静态·前端',{text:'✅ Vite❌ → webpack/WASM 通过',options:g}],
    ['5','静态站点+本地预览','静态·前端',{text:'✅',options:g}],
    ['6','Node HTTP API','非静态·后端',{text:'✅',options:g}],
    ['7','Python Web + pip','非静态·后端',{text:'✅ Flask 实测',options:g}],
    ['8','C/C++ 编译','非静态·系统',{text:'✅ clang15/CMake/Ninja',options:g}],
  ],[0.7,3.6,2.4,5.4]);
}
// 4 鸿蒙线
{
  const s=slide('鸿蒙线：编译签名全通，运行调试断路');
  cards(s,[
    {s:'✅',sc:OK,t:'HAP 编译：改码增量 29s（hvigor 设备直驱，33 tasks，16 执行）'},
    {s:'✅',sc:OK,t:'签名+校验：hap-sign-tool sign / verify successed，产物 102 KB'},
    {s:'❌',sc:BAD,t:'运行调试：hdc list targets = [Empty]，沙箱无 USB、无模拟器'},
    {s:'⚠',sc:'D29E08',t:'解法：外接第二台鸿蒙设备无线调试，或打通本机 hdcd 监听'},
  ]);
  s.addText('"写→编→签"齐备，"装→跑→调"断在最后一环',{x:0.6,y:6.3,w:12,h:0.6,fontSize:16,italic:true,color:MUT});
}
// 5 Java 线
{
  const s=slide('Java 线：HarmonyBrew + 真实项目验证');
  cards(s,[
    {s:'✅',sc:OK,t:'渠道：HarmonyBrew（bottle 均为 OHOS 原生构建，可直接执行）；openjdk 26.0.2.1 + 56 依赖'},
    {s:'✅',sc:OK,t:'Maven 3.9.16 brew 安装；~/.m2 华为云镜像无下载瓶颈'},
    {s:'✅',sc:OK,t:'工程 order-service：mvn package 21.5s，JUnit5 测试 3/3 通过，产出可执行 jar'},
    {s:'✅',sc:OK,t:'运行 java -jar → "created ORD-1, total=1"（主线与子 agent 双复核一致）'},
  ]);
  s.addText('坑：沙箱 ~ 双根（/data/storage/el2/... vs /storage/Users/...），JAVA_HOME/PATH 需绝对路径',{x:0.6,y:6.3,w:12,h:0.6,fontSize:15,italic:true,color:MUT});
}
// 6 前端线
{
  const s=slide('前端线：Vite 的墙与两条退路');
  cards(s,[
    {s:'❌',sc:BAD,t:'Vite / esbuild / rollup@4 native / SWC / tailwind-oxide 全线不可用（npm 报 Unsupported platform: ohos arm64 LE 只是表层）'},
    {s:'✅',sc:OK,t:'退路A 纯 JS：webpack5+ts-loader+dart-sass 构建 React+TSX+SCSS+Tailwind，10.4s → 260KB bundle，HTTP 200'},
    {s:'✅',sc:OK,t:'退路B WASM：rollup alias→@rollup/wasm-node+plugin-typescript，15.5s → 1.35MB，HTTP 200'},
    {s:'⚠',sc:'D29E08',t:'WASM 代价：慢 1.5–2.5×、RSS 峰值 481MB；esbuild 无官方 wasm 回退（vite#13208 NOT_PLANNED）'},
  ]);
}
// 7 根因
{
  const s=slide('根因：不是签名，是 ELF section header 校验');
  bullets(s,[
    '假说「SELinux 来源标签」被推翻：自编 ELF 与其 cat 副本标签相同（hmdfs:s0）都能执行；chmod/硬链接均非变量',
    '决定性实验：把正常可跑 ELF 的 shdr 偏移字段写坏 8 字节 → 立刻 permission denied（rc=126）',
    '鸿蒙 loader 严格校验 section header；Go 二进制（file 报 bad shdr）与 Rust native 因此被拒，Linux loader 对此宽容',
    'HNP / HarmonyBrew bottle 为 OHOS 原生构建 → 不受影响',
    '一次嗅探给你现象，一组对照实验给你根因',
  ]);
}
// 8 性能
{
  const s=slide('性能观测');
  table(s,[
    [{text:'项目',options:{bold:true,color:MUT}},{text:'耗时',options:{bold:true,color:MUT}},{text:'备注',options:{bold:true,color:MUT}}],
    ['鸿蒙 HAP 增量构建','29 s','33 tasks，16 执行'],
    ['Java mvn package','21.5 s','含 JUnit 执行'],
    ['webpack 纯 JS 构建','10.4 s','260KB 产物'],
    ['Rollup WASM 构建','15.5–25.8 s','方差大，RSS 峰值 481MB'],
    ['npm 安装 314 包','15 s','须 --ignore-scripts'],
    ['Flask / Redis 启动','4 s / 1 s','服务可用'],
    ['npm ping（境外 registry）','PONG 1156 ms','npmmirror 更快'],
  ],[4.2,3,4.9]);
}
// 9 摩擦点
{
  const s=slide('摩擦点清单');
  bullets(s,[
    '外来原生二进制被 shdr 校验拦截 → 前端锁定纯 JS / WASM 栈',
    '无部署通道 → 客户端闭环断在最后一环（Top8 唯一保留失败项）',
    '系统预置无 JVM → 依赖 HarmonyBrew 渠道（装后体验正常）',
    '沙箱 ~ 双根路径；hmdfs 属主触发 git dubious ownership（safe.directory）；/tmp 只读',
    'Electron node 的 stderr "thread qos" 噪声；process.platform=ohos 致 optional deps 缺装',
  ]);
}
// 10 结论
{
  const s=slide('结论与建议栈');
  cards(s,[
    {s:'✅',sc:OK,t:'可投产：Node / Python / Java 后端、C/C++、Redis/SQLite、静态站点、纯JS/WASM 前端、HAP 编译+签名'},
    {s:'❌',sc:BAD,t:'待解：运行调试通道（外接设备 / hdcd 监听打通后此环补全）'},
    {s:'★',sc:ACC,t:'建议栈：HNP 系统工具 + HarmonyBrew 用户软件 + webpack 为主/rollup-wasm 备选 + hvigor 直驱；真机验证放外部设备'},
    {s:'¶',sc:'D29E08',t:'原则：完备度→有无问题→性能/易用性；判"不可用"前必须穷举渠道 + 项目级实测'},
  ]);
  s.addText('依据：dev-top8-lab/BENCH.md（git 提交 60906f0）',{x:0.6,y:6.5,w:12,h:0.5,fontSize:14,color:MUT});
}

p.writeFile({ fileName:'harmonyos-dev-bench.pptx' }).then(f=>console.log('written:',f));
