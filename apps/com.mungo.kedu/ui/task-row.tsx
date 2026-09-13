import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Checkbox, Icon, cn } from "@monkey-mini-app/ui";

import { overdueTier, scheduleOf } from "../shared/model";
import type { Task } from "../shared/types";
import { DueChip, PriorityGlyph, SubtaskTicks, TagPill, TaskCheck } from "./atoms";
import { useStore } from "./store";

export type RowDnd = {
  draggable: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
};

// the title starts after grip + check + glyph; the expanded checklist lines up with it
const TITLE_INSET = 71;

export function TaskRow(props: { task: Task; dnd: RowDnd; inGrace?: boolean; sweep?: number }) {
  const { openTask, actions, selectedId, selectMode, chosen, toggleSelect, setTagFilter, expandSubs, hoverTag, hoverPrio, today } = useStore();
  const t = props.task;
  const meta = scheduleOf(t, today);
  // null = follow the global preference; a click on this row overrides it
  const [override, setOverride] = React.useState<boolean | null>(null);
  const showSubs = override === null ? expandSubs : override;
  let subDone = 0;
  for (let i = 0; i < t.subtasks.length; i++) if (t.subtasks[i].done) subDone = subDone + 1;
  const isOn = selectedId === t.id || chosen.indexOf(t.id) >= 0;
  const tier = t.done ? 0 : overdueTier(meta, t.priority);
  // dry-run preview: while a tag is hovered, rows it would filter out fade back
  const previewOut = Boolean((hoverTag && t.tags.indexOf(hoverTag) < 0) || (hoverPrio !== null && t.priority !== hoverPrio));
  // the grip slot only exists when the row can actually be dragged
  const gripOut = selectMode || !props.dnd.draggable;

  function toggleSub(id: string) {
    void actions.patch(t.id, {
      subtasks: t.subtasks.map(function (s) {
        return s.id === id ? { id: s.id, title: s.title, done: !s.done } : s;
      }),
    });
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="relative list-none"
      style={{ borderColor: "color-mix(in oklab, var(--border) 55%, transparent)" }}
    >
      {props.dnd.dropTarget ? <span className="bg-foreground absolute inset-x-0 -top-px h-px" /> : null}
      <div
        draggable={props.dnd.draggable}
        onDragStart={props.dnd.onDragStart}
        onDragOver={props.dnd.onDragOver}
        onDrop={props.dnd.onDrop}
        onDragEnd={props.dnd.onDragEnd}
        data-on={isOn ? "true" : "false"}
        onClick={function () {
          if (selectMode) toggleSelect(t.id);
          else openTask(t.id);
        }}
        className={cn(
          "kd-row group relative border-b last:border-b-0",
          tier === 1 ? "bg-destructive/[0.06]" : tier === 2 ? "bg-destructive/[0.11]" : tier === 3 ? "bg-destructive/[0.17]" : "",
          props.dnd.dragging ? "kd-dragging" : "",
          previewOut ? "kd-preview-out" : ""
        )}
        style={{ borderColor: "color-mix(in oklab, var(--border) 55%, transparent)" }}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <motion.span
            className="shrink-0 overflow-hidden"
            initial={false}
            animate={{
              width: gripOut ? 0 : 13,
              marginRight: gripOut ? -12 : 0,
              opacity: gripOut ? 0 : 1,
            }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <span className={cn("inline-flex", props.dnd.draggable ? "kd-grip cursor-grab" : "kd-veil")}>
              <Icon.GripVertical size={13} strokeWidth={2} />
            </span>
          </motion.span>

          {/* one fixed slot, so switching modes never shifts the row or leaves a blank */}
          <span className="relative grid size-4 shrink-0 place-items-center">
            <motion.span
              className="absolute inset-0 grid place-items-center"
              initial={false}
              animate={{ opacity: selectMode ? 0 : 1, scale: selectMode ? 0.72 : 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={selectMode ? { pointerEvents: "none" } : undefined}
            >
              <TaskCheck
                done={t.done}
                onToggle={function () {
                  void actions.toggle(t.id);
                }}
              />
            </motion.span>
            <motion.span
              className="absolute inset-0 grid place-items-center"
              initial={false}
              animate={{ opacity: selectMode ? 1 : 0, scale: selectMode ? 1 : 0.72 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={selectMode ? undefined : { pointerEvents: "none" }}
              onClick={function (e) {
                e.stopPropagation();
              }}
            >
              <Checkbox
                checked={chosen.indexOf(t.id) >= 0}
                onCheckedChange={function () {
                  toggleSelect(t.id);
                }}
              />
            </motion.span>
          </span>

          <PriorityGlyph priority={t.priority} className="mt-px" />

          <span
            className={cn(
              "min-w-0 shrink truncate text-sm leading-5",
              t.done ? "text-muted-foreground line-through" : "text-foreground"
            )}
          >
            {t.title}
          </span>

          {/* sits right after the title and is drawn as a button, so it reads as expandable */}
          {t.subtasks.length ? (
            <button
              type="button"
              aria-expanded={showSubs}
              aria-label={showSubs ? "收起子任务" : "展开子任务"}
              title={showSubs ? "收起子任务" : "展开子任务"}
              onClick={function (e) {
                e.stopPropagation();
                setOverride(!showSubs);
              }}
              className={cn(
                "border-foreground/25 inline-flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-[3px] font-mono transition-colors",
                showSubs ? "border-foreground bg-foreground text-background" : "text-foreground hover:border-foreground"
              )}
              style={{ fontSize: "11px" }}
            >
              <motion.span
                className="inline-flex"
                initial={false}
                animate={{ rotate: showSubs ? 90 : 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <Icon.ChevronRight size={10} strokeWidth={2.4} />
              </motion.span>
              <SubtaskTicks done={subDone} total={t.subtasks.length} />
              <span className="tabular-nums">{String(subDone) + "/" + String(t.subtasks.length)}</span>
            </button>
          ) : null}

          <span className="flex-1" />

          {props.inGrace ? (
            <button
              type="button"
              title="撤销完成"
              onClick={function (e) {
                e.stopPropagation();
                void actions.toggle(t.id);
              }}
              className="kd-ghost inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
              style={{ fontSize: "10.5px" }}
            >
              <Icon.Undo2 size={11} strokeWidth={2} />
              撤销
            </button>
          ) : (
          <span className="flex shrink-0 items-center gap-3">
            {(t.images || []).length ? (
              <span className="inline-flex items-center gap-0.5 text-muted-foreground" title={String((t.images || []).length) + " 张图片"}>
                <Icon.Image size={12} strokeWidth={1.8} />
                {(t.images || []).length > 1 ? (
                  <span className="tabular-nums" style={{ fontSize: "10px" }}>
                    {(t.images || []).length}
                  </span>
                ) : null}
              </span>
            ) : null}
            {t.notes ? <Icon.FileText size={12} strokeWidth={1.8} className="text-muted-foreground" /> : null}
            <span className="hidden items-center gap-1.5 lg:flex">
              {t.tags.slice(0, 3).map(function (tag) {
                return (
                  <TagPill
                    key={tag}
                    tag={tag}
                    onClick={function (e) {
                      e.stopPropagation();
                      setTagFilter(tag);
                    }}
                  />
                );
              })}
            </span>
            <DueChip meta={meta} priority={t.priority} />
          </span>
          )}

          {props.inGrace ? (
          <span
            className="kd-sweep"
            style={{ transform: "scaleX(" + String(props.sweep === undefined ? 1 : props.sweep) + ")" }}
          />
        ) : null}
        </div>

        <AnimatePresence initial={false}>
          {showSubs && t.subtasks.length ? (
            <motion.div
              key="subs"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div
                className="flex flex-col gap-1.5 pb-3 pr-3"
                style={{ paddingLeft: TITLE_INSET }}
                onClick={function (e) {
                  e.stopPropagation();
                }}
              >
                {t.subtasks.map(function (s) {
                  return (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <TaskCheck
                        done={s.done}
                        onToggle={function () {
                          toggleSub(s.id);
                        }}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-xs",
                          s.done ? "text-muted-foreground line-through" : "text-muted-foreground"
                        )}
                      >
                        {s.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}
