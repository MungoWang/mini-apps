import * as React from "react";
import { Icon, Kanban, cn } from "@monkey-mini-app/ui";
import type { KanbanCard, KanbanColumn } from "@monkey-mini-app/ui";

import { scheduleOf } from "../shared/model";
import type { Task } from "../shared/types";
import { PRIORITY_LABEL, PRIORITY_TITLE } from "../shared/types";
import { DueChip, PriorityGlyph, SubtaskMeter } from "./atoms";
import { useStore } from "./store";

export function BoardView() {
  const { tasks, actions, openTask, today } = useStore();
  // The board's own wrapper never overflows (columns shrink), so we do not guess which element
  // scrolls: any horizontal scroll anywhere is captured, and only that element decides whether
  // the right edge still has something beyond it. Vertical scrolls are ignored on purpose.
  const [edges, setEdges] = React.useState({ left: false, right: true });

  React.useEffect(function () {
    function onScroll(e: Event) {
      const el = e.target as HTMLElement | null;
      if (!el || typeof el.scrollWidth !== "number" || typeof el.clientWidth !== "number") return;
      const over = el.scrollWidth - el.clientWidth;
      if (over <= 4) return;
      setEdges({ left: el.scrollLeft > 4, right: over - el.scrollLeft > 4 });
    }
    document.addEventListener("scroll", onScroll, true);
    return function () {
      document.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  const maskClass = edges.left && edges.right ? "kd-mask-both" : edges.left ? "kd-mask-left" : edges.right ? "kd-mask-right" : "";
  // the fade is a mask on the scroller itself (no overlay layer), and it only exists while
  // there is still board off to the right

  const columns: KanbanColumn[] = [
    { id: "p1", title: "P1 · " + PRIORITY_TITLE[1] },
    { id: "p2", title: "P2 · " + PRIORITY_TITLE[2] },
    { id: "p3", title: "P3 · " + PRIORITY_TITLE[3] },
    { id: "p4", title: "P4 · " + PRIORITY_TITLE[4] },
    { id: "done", title: "已完成" },
  ];

  const cards: KanbanCard[] = React.useMemo(
    function () {
      return tasks.map(function (t) {
        return {
          id: t.id,
          columnId: t.done ? "done" : "p" + String(t.priority),
          title: t.title,
          priority: PRIORITY_LABEL[t.priority],
          tags: t.tags,
        };
      });
    },
    [tasks]
  );

  const byId = React.useMemo(
    function () {
      const map: Record<string, Task> = {};
      for (let i = 0; i < tasks.length; i++) map[tasks[i].id] = tasks[i];
      return map;
    },
    [tasks]
  );

  const move = React.useCallback(
    async function (next: KanbanCard[]) {
      const before: Record<string, string> = {};
      for (let i = 0; i < cards.length; i++) before[cards[i].id] = cards[i].columnId;
      let moved: KanbanCard | null = null;
      for (let i = 0; i < next.length; i++) {
        const c = next[i];
        if (before[c.id] !== undefined && before[c.id] !== c.columnId) {
          moved = c;
          break;
        }
      }
      if (!moved) return;
      const target = moved.columnId;
      if (target === "done") await actions.patch(moved.id, { done: true });
      else await actions.patch(moved.id, { priority: Number(target.slice(1)), done: false });
    },
    [cards, actions]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className={cn("min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2", maskClass)}>
      <div className="h-full">
        <Kanban
          columns={columns}
          cards={cards}
          onCardsChange={function (next) {
            void move(next);
          }}
          onCardClick={function (card) {
            openTask(card.id);
          }}
          renderCard={function (card) {
            const t = byId[card.id];
            if (!t) return <span className="text-sm">{card.title}</span>;
            const meta = scheduleOf(t, today);
            let subDone = 0;
            for (let i = 0; i < t.subtasks.length; i++) if (t.subtasks[i].done) subDone = subDone + 1;
            return (
              <div className="flex w-full flex-col gap-2 px-3 pb-3 pt-2.5">
                <div className="flex items-center gap-2">
                  <PriorityGlyph priority={t.priority} />
                  <span className="flex-1" />
                  <DueChip meta={meta} priority={t.priority} />
                </div>
                <span className={cn("text-sm leading-5", t.done ? "text-muted-foreground line-through" : "text-foreground")}>
                  {t.title}
                </span>
                {t.tags.length || t.subtasks.length || t.notes || (t.images || []).length ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {t.tags.slice(0, 2).map(function (tag) {
                      return (
                        <span key={tag} className="font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
                          {"#" + tag}
                        </span>
                      );
                    })}
                    <span className="flex-1" />
                    {t.notes ? <Icon.FileText size={12} strokeWidth={1.8} className="text-muted-foreground" /> : null}
                    {(t.images || []).length ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-muted-foreground"
                        title={String((t.images || []).length) + " 张图片"}
                      >
                        <Icon.Image size={12} strokeWidth={1.8} />
                        {(t.images || []).length > 1 ? (
                          <span className="tabular-nums" style={{ fontSize: "10px" }}>
                            {(t.images || []).length}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                    <SubtaskMeter done={subDone} total={t.subtasks.length} />
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </div>
      </div>
    </div>
  );
}
