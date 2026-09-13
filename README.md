# mini-apps

可分享的 [monkey-mini-app](https://github.com/MungoWang/monkey-mini-app) / dsh 小程序合集。

每个目录是一个独立 app：`apps/<appId>/`（含 `manifest.json` + `ui.tsx` + `main.api.ts`）。

## 前置

本机已安装 dsh 插件，例如：

```bash
dsh plugin add --profile web -w @monkey-mini-app/dsh-mini-app@0.1.15
```

## 安装某一个 app

把仓库里的 app 拷进本机 runtime（以「刻度清单」为例）：

```bash
npx --yes degit MungoWang/mini-apps/apps/com.mungo.kedu ~/.monkey-mini-app/runtime/apps/com.mungo.kedu
```

或用 git：

```bash
git clone --depth 1 https://github.com/MungoWang/mini-apps.git /tmp/mini-apps \
  && mkdir -p ~/.monkey-mini-app/runtime/apps \
  && rm -rf ~/.monkey-mini-app/runtime/apps/com.mungo.kedu \
  && cp -R /tmp/mini-apps/apps/com.mungo.kedu ~/.monkey-mini-app/runtime/apps/ \
  && rm -rf /tmp/mini-apps
```

然后打开 dsh web → 小程序，应能看到 **刻度清单**（`com.mungo.kedu`）。若列表未刷新，重启 `dsh web` 或对该 app 执行一次 reload。

> `storage/` 不进仓库：每台机器各自有本地数据。

## 目录

| App ID | 名称 | 路径 |
|---|---|---|
| `com.mungo.kedu` | 刻度清单 | [`apps/com.mungo.kedu`](./apps/com.mungo.kedu) |
