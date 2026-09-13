# mini-apps

[English](README.md) | [中文](README.zh.md)

A public collection of shareable [monkey-mini-app](https://github.com/MungoWang/monkey-mini-app) / dsh mini-apps.

Each folder under `apps/<appId>/` is one self-contained app (`manifest.json` + `ui.tsx` + `main.api.ts`, plus optional `ui/` / `api/` / `shared/`). Drop it into your local runtime and it shows up in the gallery next to chat.

## Prerequisites

Install the dsh adapter first (once per machine):

```bash
dsh plugin add --profile web -w @monkey-mini-app/dsh-mini-app@0.1.15
```

Then:

```bash
dsh web --no-open   # http://127.0.0.1:3080 ; apps host default :17880
```

## Install one app

**刻度清单** (`com.mungo.kedu`) — local todos: today / inbox / upcoming / board / stats, quick parse, subtasks, tags, shortcuts.

```bash
npx --yes degit MungoWang/mini-apps/apps/com.mungo.kedu ~/.monkey-mini-app/runtime/apps/com.mungo.kedu
```

Or with git:

```bash
git clone --depth 1 https://github.com/MungoWang/mini-apps.git /tmp/mini-apps \
  && mkdir -p ~/.monkey-mini-app/runtime/apps \
  && rm -rf ~/.monkey-mini-app/runtime/apps/com.mungo.kedu \
  && cp -R /tmp/mini-apps/apps/com.mungo.kedu ~/.monkey-mini-app/runtime/apps/ \
  && rm -rf /tmp/mini-apps
```

Open dsh web →「小程序」. You should see **刻度清单**. If the gallery does not refresh, restart `dsh web` or reload that app.

> `storage/` is gitignored. Each machine keeps its own data.

## Catalog

| App ID | Name | Path |
|---|---|---|
| `com.mungo.kedu` | 刻度清单 | [`apps/com.mungo.kedu`](./apps/com.mungo.kedu) |

## Add another app

1. Put sources under `apps/<reverse-dns-id>/` with a valid `manifest.json`.
2. Do not commit `storage/`, `.autogen/`, or `node_modules/`.
3. Document the install line in both READMEs.
