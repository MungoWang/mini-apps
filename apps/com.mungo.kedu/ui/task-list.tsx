import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Button,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  IlluEmpty,
  IlluSearch,
  cn,
} from "@monkey-mini-app/ui";

import type { GroupId } from "../shared/model";
import { GROUP_ORDER, GROUP_TITLE, groupOf, inView, sortTasks } from "../shared/model";
import type { Task, ViewId } from "../shared/types";
import { Micro, SectionHead } from "./atoms";
import { useStore } from "./store";
import { TaskRow } from "./task-row";
import type { RowDnd } from "./task-row";

function emptyCopy(view: ViewId): { title: string; hint: string } {
  if (view === "today") return { title: "今天没有到期的事", hint: "在下面写一条，用 @明天 排到明天。" };
  if (view === "inbox") return { title: "临时仓已清空", hint: "每一件都已经排期或归类了 —— 想到什么随时再写进来。" };
  if (view === "upcoming") return { title: "后面几天还没有安排", hint: "用 @周五 或 @3/12 把任务排到未来。" };
  if (view === "done") return { title: "还没有完成的任务", hint: "完成第一条之后，这里会出现你的节奏。" };
  return { title: "这里是空的", hint: "换个视图看看。" };
}

// the countdown is DERIVED from the completion timestamp, not from a CSS animation: moving or
// rebuilding a row cannot reset it, so concurrent pills always keep their own progress
function sweepLeft(completedAt: string | undefined, now: number): number {
  if (!completedAt) return 1;
  const done = new Date(completedAt).getTime();
  if (!done) return 1;
  return Math.max(0, Math.min(1, (done + 5000 - now) / 5000));
}

export function TaskList() {
  const { tasks, view, sort, today, query, tagFilter, prioFilter, selectMode, actions, graceIds, setQuery, setTagFilter, setPrioFilter } =
    useStore();
  const [clock, setClock] = React.useState(Date.now());
  React.useEffect(
    function () {
      if (graceIds.length === 0) return;
      const id = window.setInterval(function () {
        setClock(Date.now());
      }, 120);
      return function () {
        window.clearInterval(id);
      };
    },
    [graceIds.length]
  );

  const dragId = React.useRef<string | null>(null);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const visible = React.useMemo(
    function () {
      const q = query.trim().toLowerCase();
      let list = tasks.filter(function (t) {
        // a just-completed task stays visible until its grace window closes
        return inView(t, view, today) || graceIds.indexOf(t.id) >= 0;
      });
      if (tagFilter) {
        list = list.filter(function (t) {
          return t.tags.indexOf(tagFilter) >= 0;
        });
      }
      if (prioFilter.length) {
        list = list.filter(function (t) {
          return prioFilter.indexOf(t.priority) >= 0;
        });
      }
      if (q) {
        list = list.filter(function (t) {
          return (
            t.title.toLowerCase().indexOf(q) >= 0 ||
            t.notes.toLowerCase().indexOf(q) >= 0 ||
            t.tags.join(" ").toLowerCase().indexOf(q) >= 0
          );
        });
      }
      return sortTasks(list, sort);
    },
    [tasks, view, today, tagFilter, prioFilter, query, sort, graceIds]
  );

  const groups = React.useMemo(
    function () {
      const map: Record<string, Task[]> = {};
      const seen: GroupId[] = [];
      for (let i = 0; i < visible.length; i++) {
        const t = visible[i];
        // graced rows keep the group they had before completion, so they do not jump sections
        const g = groupOf(graceIds.indexOf(t.id) >= 0 ? { ...t, done: false } : t, today);
        if (!map[g]) {
          map[g] = [];
          seen.push(g);
        }
        map[g].push(t);
      }
      seen.sort(function (a, b) {
        return GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b);
      });
      return seen.map(function (g) {
        return { id: g, title: GROUP_TITLE[g], items: map[g] };
      });
    },
    [visible, today, graceIds]
  );

  const canDrag = sort === "manual" && !selectMode;

  function dropOn(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    setDragging(null);
    setOverId(null);
    if (!from || from === targetId) return;
    const ids = visible.map(function (t) {
      return t.id;
    });
    const fromAt = ids.indexOf(from);
    const toAt = ids.indexOf(targetId);
    if (fromAt < 0 || toAt < 0) return;
    const next = ids.slice();
    next.splice(toAt, 0, next.splice(fromAt, 1)[0]);
    void actions.reorder(next);
  }

  function dndFor(t: Task): RowDnd {
    return {
      draggable: canDrag,
      dragging: dragging === t.id,
      dropTarget: overId === t.id && dragging !== null && dragging !== t.id,
      onDragStart: function () {
        dragId.current = t.id;
        setDragging(t.id);
      },
      onDragOver: function (e) {
        e.preventDefault();
        if (overId !== t.id) setOverId(t.id);
      },
      onDrop: function (e) {
        e.preventDefault();
        dropOn(t.id);
      },
      onDragEnd: function () {
        dragId.current = null;
        setDragging(null);
        setOverId(null);
      },
    };
  }

  if (visible.length === 0) {
    const filtered = Boolean(query.trim() || tagFilter || prioFilter.length > 0);
    const copy = emptyCopy(view);
    return (
      <div className="grid min-h-0 flex-1 place-items-center py-8">
        <Empty>
          <EmptyHeader>
            <EmptyMedia>{filtered ? <IlluSearch className="w-36" /> : <IlluEmpty className="w-36" />}</EmptyMedia>
            <EmptyTitle>{filtered ? "没有匹配的任务" : copy.title}</EmptyTitle>
            <EmptyDescription>{filtered ? "换个关键词，或者清掉筛选条件。" : copy.hint}</EmptyDescription>
          </EmptyHeader>
          {filtered ? (
            <EmptyContent>
              <Button
                variant="outline"
                size="sm"
                onClick={function () {
                  setQuery("");
                  setTagFilter(null);
                  setPrioFilter([]);
                }}
              >
                清空筛选
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-8 pr-1">
      <div className="flex flex-col gap-5">
        {groups.map(function (g) {
          const overdue = g.id === "overdue";
          return (
            <section key={g.id} className="flex flex-col gap-2">
              <SectionHead
                title={g.title}
                count={g.items.length}
                right={overdue ? <Micro className="shrink-0 text-destructive">需要处理</Micro> : null}
              />
              {/* while any row is inside its grace window the list must not visually reshuffle:
                  a layout animation re-measures and can rebuild rows, which restarts the CSS
                  countdown sweep and makes every pill snap back to the same progress */}
              <motion.ul
                layout={graceIds.length === 0}
                className="kd-card border-border/[0.78] overflow-hidden rounded-2xl border"
              >
                <AnimatePresence initial={false}>
                  {g.items.map(function (t) {
                    return (
                      <TaskRow
                        key={t.id}
                        task={t}
                        dnd={dndFor(t)}
                        inGrace={graceIds.indexOf(t.id) >= 0}
                        sweep={sweepLeft(t.completedAt, clock)}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.ul>
            </section>
          );
        })}
        {!canDrag && visible.length > 1 ? (
          <p className="text-center">
            <Micro className="opacity-70">切到「手动排序」后可拖动行排序</Micro>
          </p>
        ) : null}
      </div>
    </div>
  );
}
