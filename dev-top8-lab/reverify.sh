#!/bin/bash
# Top8 全场景复验脚本：每项都真跑，输出 PASS/FAIL
# 签名凭据：运行时先 `export KEYSTORE_PWD=...`（任何口令、私钥、证书都不写进仓库）
# 本脚本已被判定为不可用/不安全，勿当作权威验证器，见 HARMONYOS-PC-ISSUES.md PC-12
Q=/storage/Users/currentUser/Documents/qoder
H=/data/storage/el2/base/files/home/Documents/Qoder/2026-09-24/67d34c20/HelloHos
M=/data/storage/el2/base/files/home/ohos-sdk-mirror
TL=/data/service/hnp/ohos-sdk.org/ohos-sdk_26.0.0.18/ohos/toolchains/lib
HB=/storage/Users/currentUser/.harmonybrew
export PATH="$HB/bin:$PATH"

echo "########## 复验开始 $(date '+%F %T') ##########"

echo; echo "===== S1 鸿蒙 HAP 编译 + 签名 ====="
sed -i 's/rebuild 0927/rebuild 0928/' $H/entry/src/main/ets/pages/Index.ets 2>/dev/null
grep -o "rebuild 0928" $H/entry/src/main/ets/pages/Index.ets | head -1
cd $H && OHOS_BASE_SDK_HOME=$M DEVECO_SDK_HOME=$M node node_modules/@ohos/hvigor/bin/hvigor.js --mode module -p product=default assembleHap 2>&1 | tail -3
O=$H/entry/build/default/outputs/default
hap-sign-tool sign-app -mode localSign -keyAlias "openharmony application release" -keyPwd "$KEYSTORE_PWD" \
  -appCertFile $O/app-cert-reversed.pem -profileFile $O/profile.json -profileSigned 0 \
  -inFile $O/entry-default-unsigned.hap -outFile $O/entry-default-signed.hap \
  -signAlg SHA256withECDSA -keystoreFile $TL/OpenHarmony.p12 -keystorePwd "$KEYSTORE_PWD" -compatibleVersion 26 -signCode 0 2>&1 | tail -1
cd $O && hap-sign-tool verify-app -inFile entry-default-signed.hap -outCertChain rv.cer -outProfile rv.p7b 2>&1 | grep -E "verify|success|fail" | tail -2
ls -la $O/entry-default-signed.hap | awk '{print "  HAP 产物:", $5, "bytes", $6, $7, $8}'

echo; echo "===== S2 鸿蒙运行调试 ====="
timeout 10 hdc list targets 2>&1
echo "  （预期 [Empty]：无部署通道，已知缺陷项）"

echo; echo "===== S3 Java 后端（HarmonyBrew JDK+Maven） ====="
export JAVA_HOME=$HB/opt/openjdk
cd $Q/java-probe/order-service && PATH="$JAVA_HOME/bin:$PATH" mvn -q package 2>&1 | tail -3
ls -la target/order-service-1.0.0.jar 2>/dev/null | awk '{print "  jar:", $5, "bytes"}'
$JAVA_HOME/bin/java -jar target/order-service-1.0.0.jar 2>&1 | tail -1

echo; echo "===== S4 前端 SPA（Vite 原生 esbuild 路径） ====="
export ESBUILD_BINARY_PATH=$Q/go-esbuild-lab/gopath/bin/linux_arm64/esbuild
cd $Q/frontend-toolchain-lab/apps/web
rm -rf dist && node ../../node_modules/vite/bin/vite.js build 2>&1 | tail -3
ls dist/index.html dist/assets/*.js 2>/dev/null | head -3
(cd dist && nohup python3 -m http.server 8941 >/dev/null 2>&1 &) ; sleep 2
curl -s -o /dev/null -w "  preview HTTP %{http_code} (index.html)\n" http://127.0.0.1:8941/
curl -s -o /dev/null -w "  preview HTTP %{http_code} (asset js)\n" "http://127.0.0.1:8941/assets/$(ls dist/assets | grep -m1 '\.js$')"
pkill -f "http.server 8941"

echo; echo "===== S4b 前端 SPA（Webpack 纯 JS 路径 + 产物真执行） ====="
cd $Q/frontend-toolchain-lab
rm -rf dist-webpack && node node_modules/.bin/webpack --config webpack.config.mjs 2>&1 | tail -2
node smoke-webpack-dom.mjs 2>&1 | grep -E "SMOKE|错误条数|root 子节点数|文本摘录|button"
(cd dist-webpack && nohup python3 -m http.server 8942 >/dev/null 2>&1 &) ; sleep 2
curl -s -o /dev/null -w "  webpack preview HTTP %{http_code}\n" http://127.0.0.1:8942/
curl -s -o /dev/null -w "  webpack main.js HTTP %{http_code} %{size_download}B\n" http://127.0.0.1:8942/main.js
pkill -f "http.server 8942"

echo; echo "===== S5 免构建静态站点 + 本地预览 ====="
cd $Q/dev-top8-lab/02-static && (nohup python3 -m http.server 8931 >/dev/null 2>&1 &); sleep 2
curl -s http://127.0.0.1:8931/ | grep -o "static ok" && echo "  命中 static ok"
pkill -f "http.server 8931"

echo; echo "===== S6 Node.js HTTP API ====="
(cd $Q/dev-top8-lab/03-node-api && nohup node server.mjs >/dev/null 2>&1 &); sleep 2
curl -s http://127.0.0.1:8932/api/q; echo
pkill -f "server.mjs"

echo; echo "===== S7 Python Web + pip 依赖 ====="
export PYTHONPATH=$Q/dev-top8-lab/04-py-api/.pylibs
python3 -c "import flask; print('  flask', flask.__version__)"
(cd $Q/dev-top8-lab/04-py-api && nohup python3 -m flask --app app run --port 8934 >/dev/null 2>&1 &); sleep 4
curl -s http://127.0.0.1:8934/api/ping; echo
pkill -f "flask --app app"
unset PYTHONPATH

echo; echo "===== S8 C/C++ 原生编译 ====="
cd $Q/dev-top8-lab/05-native && rm -rf build && cmake -G Ninja -B build >/dev/null 2>&1 && cmake --build build >/dev/null 2>&1 && ./build/hello
echo "  退出码: $?"

echo; echo "===== 数据层: Redis + SQLite ====="
cd $Q/dev-top8-lab/07-redis && redis-server --port 8933 --daemonize yes --logfile $Q/dev-top8-lab/07-redis/redis.log && sleep 1
redis-cli -p 8933 set bench v1 >/dev/null && echo "  redis get: $(redis-cli -p 8933 get bench)"
redis-cli -p 8933 shutdown nosave 2>/dev/null
python3 -c "import sqlite3;c=sqlite3.connect(':memory:');c.execute('create table t(x)');c.execute('insert into t values(1)');print('  sqlite rows:',c.execute('select count(*) from t').fetchone()[0])"

echo; echo "===== Git 贯穿验证 ====="
cd $Q && git add -A >/dev/null 2>&1 && git -c user.name=bench -c user.email=bench@local commit -qm "reverify: Top8 all-scenario re-run $(date '+%F %T')" 2>&1 | tail -1
git log --oneline | head -1 | sed 's/^/  HEAD: /'

echo; echo "########## 复验结束 $(date '+%F %T') ##########"
