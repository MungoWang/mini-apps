import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Icon, Kbd, cn } from "@monkey-mini-app/ui";

import { Hint, Micro } from "./atoms";
import { VIEWS } from "./nav";
import { useStore } from "./store";

type Cmd = { id: string; label: string; hint: string; run: () => void };

export function Palette(props: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { tasks, actions, setView, openTask } = useStore();
  const [q, setQ] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  React.useEffect(
    function () {
      if (props.open) {
        setQ("");
        setCursor(0);
      }
    },
    [props.open]
  );

  const commands = React.useMemo(
    function () {
      const list: Cmd[] = [];
      const text = q.trim();
      list.push({
        id: "add",
        label: text ? "新建任务：" + text : "新建任务",
        hint: "回车",
        run: function () {
          if (text) void actions.add(text);
        },
      });
      for (let i = 0; i < VIEWS.length; i++) {
        const v = VIEWS[i];
        list.push({
          id: "view:" + v.id,
          label: "切换到 " + v.label,
          hint: "视图 " + v.key,
          run: function () {
            setView(v.id);
          },
        });
      }
      list.push({
        id: "clear",
        label: "清理已完成的任务",
        hint: "操作",
        run: function () {
          void actions.clearDone();
        },
      });
      list.push({
        id: "reset",
        label: "恢复示例数据",
        hint: "操作",
        run: function () {
          void actions.reset();
        },
      });
      for (let i = 0; i < tasks.length && i < 60; i++) {
        const t = tasks[i];
        list.push({
          id: "task:" + t.id,
          label: t.title,
          hint: t.done ? "已完成" : "任务",
          run: function () {
            openTask(t.id);
          },
        });
      }
      return list;
    },
    [q, tasks, actions, setView, openTask]
  );

  const filtered = React.useMemo(
    function () {
      const s = q.trim().toLowerCase();
      if (!s) {
        return commands
          .filter(function (c) {
            return c.id.indexOf("task:") !== 0;
          })
          .slice(0, 10);
      }
      return commands
        .filter(function (c) {
          return c.label.toLowerCase().indexOf(s) >= 0;
        })
        .slice(0, 12);
    },
    [commands, q]
  );

  function exec(cmd: Cmd | undefined) {
    if (!cmd) return;
    cmd.run();
    props.onOpenChange(false);
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="overflow-hidden p-0" style={{ maxWidth: 620 }}>
        <DialogHeader className="sr-only">
          <DialogTitle>命令面板</DialogTitle>
        </DialogHeader>
        <div className="border-border/[0.78] flex items-center gap-2.5 border-b px-4 py-3">
          <Icon.Search size={14} strokeWidth={2} className="shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            placeholder="搜索任务，或输入内容直接新建…"
            onChange={function (e) {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={function (e) {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor(function (c) {
                  return Math.min(c + 1, filtered.length - 1);
                });
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor(function (c) {
                  return Math.max(c - 1, 0);
                });
              } else if (e.key === "Enter") {
                e.preventDefault();
                exec(filtered[cursor]);
              }
            }}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Kbd>ESC</Kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">没有匹配项</p>
          ) : (
            filtered.map(function (c, i) {
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseEnter={function () {
                    setCursor(i);
                  }}
                  onClick={function () {
                    exec(c);
                  }}
                  className={cn(
                    "kd-ghost flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === cursor ? "bg-muted/[0.72] text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  <Micro size={9} className="shrink-0">
                    {c.hint}
                  </Micro>
                </button>
              );
            })
          )}
        </div>
        <div className="border-border/[0.78] flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t px-4 py-2">
          <Hint keys={["N"]} label="新建" />
          <Hint keys={["/"]} label="筛选" />
          <Hint keys={["1-6"]} label="切换视图" />
          <span className="flex-1" />
          <Micro size={9}>刻度清单</Micro>
        </div>
      </DialogContent>
    </Dialog>
  );
}
