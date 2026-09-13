# mini-apps

[English](README.md) | 中文

可分享的 [monkey-mini-app](https://github.com/MungoWang/monkey-mini-app) / dsh 小程序合集。

`apps/<appId>/` 下每个目录是一个独立 app（`manifest.json` + `ui.tsx` + `main.api.ts`，以及可选的 `ui/` / `api/` / `shared/`）。拷进本机 runtime 后，就会出现在聊天旁边的小程序画廊里。

## 前置

先装好 dsh 适配插件（每台机器一次即可）：

```bash
dsh plugin add --profile web -w @monkey-mini-app/dsh-mini-app@0.1.15
```

然后：

```bash
dsh web --no-open   # http://127.0.0.1:3080 ；apps 宿主默认 :17880
```

## 安装某一个 app

**刻度清单**（`com.mungo.kedu`）— 本地待办：今日 / 收集箱 / 即将 / 看板 / 统计，快速解析、子任务、标签、快捷键。

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

打开 dsh web →「小程序」，应能看到 **刻度清单**。列表没刷新就重启 `dsh web`，或对该 app 做一次 reload。

> `storage/` 不进仓库：每台机器各自有本地数据。

## 目录

| App ID | 名称 | 路径 |
|---|---|---|
| `com.mungo.kedu` | 刻度清单 | [`apps/com.mungo.kedu`](./apps/com.mungo.kedu) |

## 再加一个 app

1. 把源码放到 `apps/<反向域名 id>/`，并写好合法的 `manifest.json`。
2. 不要提交 `storage/`、`.autogen/`、`node_modules/`。
3. 在中英文 README 里补上安装命令。
