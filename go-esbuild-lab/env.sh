# 鸿蒙 PC 原生 Go/esbuild 工具链环境
# 用法: . /storage/Users/currentUser/Documents/qoder/go-esbuild-lab/env.sh
export GOROOT=/storage/Users/currentUser/Documents/qoder/go-esbuild-lab/ohos_golang_go
export PATH="$GOROOT/bin:$PATH"
export GOPATH=/storage/Users/currentUser/Documents/qoder/go-esbuild-lab/gopath
export GOCACHE=/storage/Users/currentUser/Documents/qoder/go-esbuild-lab/gocache
export GOPROXY=https://goproxy.cn,direct
export GOSUMDB=off
# 本机构建的原生 esbuild（GOOS=linux GOARCH=arm64，本机 GOHOSTOS=openharmony）
export ESBUILD_BINARY_PATH=/storage/Users/currentUser/Documents/qoder/go-esbuild-lab/gopath/bin/linux_arm64/esbuild
