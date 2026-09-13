import * as React from "react";
import { Button, ConfirmDialog, DatePicker, Icon, TagInput, cn } from "@monkey-mini-app/ui";
import { AnimatePresence, motion } from "motion/react";

import { dateKey, parseKey, relativeTime, scheduleOf, shiftKey } from "../shared/model";
import type { Subtask } from "../shared/types";
import { Micro, Mono, PriorityGlyph, SectionHead, SubtaskMeter, TaskCheck } from "./atoms";
import { imageFilesFrom, shrinkImage } from "./image-utils";
import { useStore } from "./store";

const QUICK_DUE: { label: string; days: number }[] = [
  { label: "今天", days: 0 },
  { label: "明天", days: 1 },
  { label: "本周末", days: 5 },
  { label: "下周", days: 7 },
];

const HAIRLINE = { borderColor: "color-mix(in oklab, var(--border) 55%, transparent)" };
const CHIP_OFF = "border-border/[0.78] text-muted-foreground hover:border-foreground hover:text-foreground";

// one property per row: label on the left, live value on the right — reads as a spec sheet
// instead of a grid of equally-weighted form boxes
function Prop(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b py-3.5 last:border-b-0" style={HAIRLINE}>
      <span className="w-11 shrink-0">
        <Micro>{props.label}</Micro>
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{props.children}</div>
    </div>
  );
}

// subtasks are editable in place — adding one used to be a dead end
function SubtaskRow(props: {
  sub: Subtask;
  onToggle: () => void;
  onRename: (title: string) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = React.useState(props.sub.title);
  React.useEffect(
    function () {
      setDraft(props.sub.title);
    },
    [props.sub.title]
  );
  function commit() {
    const next = draft.trim();
    if (!next) {
      setDraft(props.sub.title);
      return;
    }
    if (next !== props.sub.title) props.onRename(next);
  }
  return (
    <div className="group flex items-center gap-2.5 border-b py-1.5 last:border-b-0" style={HAIRLINE}>
      <TaskCheck done={props.sub.done} onToggle={props.onToggle} />
      <input
        value={draft}
        aria-label="子任务标题"
        placeholder="子任务"
        onChange={function (e) {
          setDraft(e.target.value);
        }}
        onBlur={commit}
        onKeyDown={function (e) {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(props.sub.title);
            e.currentTarget.blur();
          }
        }}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
          props.sub.done ? "text-muted-foreground line-through" : "text-foreground"
        )}
      />
      <button
        type="button"
        aria-label="删除子任务"
        onClick={props.onRemove}
        className="shrink-0 text-transparent transition-colors hover:text-destructive group-hover:text-muted-foreground"
      >
        <Icon.X size={12} strokeWidth={2} />
      </button>
    </div>
  );
}

export function TaskDetail() {
  const { tasks, selectedId, openTask, actions, today } = useStore();
  const task = tasks.find(function (t) {
    return t.id === selectedId;
  });
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [draftSub, setDraftSub] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const syncedId = React.useRef<string | null>(null);
  const dockRef = React.useRef<HTMLDivElement | null>(null);
  const [imgData, setImgData] = React.useState<Record<string, string>>({});
  const [zoom, setZoom] = React.useState<string | null>(null);
  const [imgBusy, setImgBusy] = React.useState(false);
  const [imgErr, setImgErr] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const imgs = (task && task.images) || [];
  const imageIds = imgs
    .map(function (im) {
      return im.id;
    })
    .join(",");

  React.useEffect(
    function () {
      if (!imageIds) {
        setImgData({});
        return;
      }
      let live = true;
      actions.loadImages(imageIds.split(",")).then(function (map) {
        if (live) setImgData(map);
      });
      return function () {
        live = false;
      };
    },
    [imageIds]
  );

  async function attach(files: File[]) {
    if (!task || !files.length) return;
    setImgErr("");
    setImgBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const shot = await shrinkImage(files[i]);
        if (shot) await actions.addImage(task.id, shot.data, shot.w, shot.h);
      }
    } catch (e) {
      setImgErr("贴图失败，换张小一点的图片再试");
    } finally {
      setImgBusy(false);
    }
  }

  // paste anywhere while the dock is open
  React.useEffect(
    function () {
      function onPaste(e: ClipboardEvent) {
        const files = imageFilesFrom(e.clipboardData);
        if (files.length) {
          e.preventDefault();
          void attach(files);
        }
      }
      window.addEventListener("paste", onPaste);
      return function () {
        window.removeEventListener("paste", onPaste);
      };
    },
    [task ? task.id : null]
  );

  React.useEffect(
    function () {
      if (task && syncedId.current !== task.id) {
        syncedId.current = task.id;
        setTitle(task.title);
        setNotes(task.notes);
        setDraftSub("");
        setDirty(false);
      }
      if (!task) syncedId.current = null;
    },
    [task]
  );

  function edit(patch: Record<string, unknown>) {
    if (!task) return;
    setDirty(true);
    void actions.patch(task.id, patch);
  }

  function commitTitle() {
    if (!task) return;
    const next = title.trim();
    if (next && next !== task.title) void actions.patch(task.id, { title: next });
  }

  function commitNotes() {
    if (!task) return;
    if (notes !== task.notes) void actions.patch(task.id, { notes });
  }

  // autosave on a debounce, and flush in the cleanup so a pending edit can never be dropped
  // (switching to another row changes selectedId without going through close())
  React.useEffect(
    function () {
      if (!task) return;
      if (title === task.title) return;
      const id = window.setTimeout(commitTitle, 600);
      return function () {
        window.clearTimeout(id);
        commitTitle();
      };
    },
    [title, task, actions]
  );

  React.useEffect(
    function () {
      if (!task) return;
      if (notes === task.notes) return;
      const id = window.setTimeout(commitNotes, 600);
      return function () {
        window.clearTimeout(id);
        commitNotes();
      };
    },
    [notes, task, actions]
  );

  function close() {
    openTask(null);
  }

  // clicking the empty page closes the dock — but not once you have touched this task, and
  // never for a click that belongs to a picker popup or to another task row
  React.useEffect(
    function () {
      if (!task) return;
      function onDown(e: MouseEvent) {
        const el = e.target as Element | null;
        if (!el) return;
        const root = document.getElementById("root");
        if (root && !root.contains(el)) return;
        if (dockRef.current && dockRef.current.contains(el)) return;
        if (el.closest(".kd-row")) return;
        if (dirty) return;
        close();
      }
      document.addEventListener("mousedown", onDown);
      return function () {
        document.removeEventListener("mousedown", onDown);
      };
    },
    [task, dirty]
  );

  function pushSubs(next: Subtask[]) {
    if (!task) return;
    setDirty(true);
    void actions.patch(task.id, { subtasks: next });
  }

  function addSub() {
    if (!task) return;
    const text = draftSub.trim();
    if (!text) return;
    setDraftSub("");
    pushSubs(task.subtasks.concat([{ id: "s_" + Date.now().toString(36), title: text, done: false }]));
  }

  let subDone = 0;
  if (task) for (let i = 0; i < task.subtasks.length; i++) if (task.subtasks[i].done) subDone = subDone + 1;
  const sched = task ? scheduleOf(task, today) : null;
  const isSpan = Boolean(task && task.starts && task.due && task.starts !== task.due);

  return (
    <React.Fragment>
      <AnimatePresence>
        {task ? (
          <motion.div
            key="kd-dock"
            ref={dockRef}
            role="region"
            aria-label="任务详情"
            className="kd-dock"
            initial={{ y: 28, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 28, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-start gap-3 px-6 pb-1 pt-5">
              <TaskCheck
                done={task.done}
                className="mt-1.5"
                onToggle={function () {
                  setDirty(true);
                  void actions.toggle(task.id);
                }}
              />
              <div className="min-w-0 flex-1">
                <input
                  value={title}
                  aria-label="任务标题"
                  placeholder="任务标题"
                  onChange={function (e) {
                    setTitle(e.target.value);
                  }}
                  className={cn(
                    "w-full bg-transparent text-[17px] font-medium leading-6 text-foreground outline-none placeholder:text-muted-foreground",
                    task.done ? "text-muted-foreground line-through" : ""
                  )}
                />
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Micro>
                    {task.done ? "已完成 · " + relativeTime(task.completedAt) : "创建于 " + relativeTime(task.createdAt)}
                  </Micro>
                  {sched ? (
                    <React.Fragment>
                      <span className="bg-border/[0.72] h-3 w-px" />
                      <span className="font-mono text-muted-foreground" style={{ fontSize: "10.5px" }}>
                        {sched.label}
                      </span>
                    </React.Fragment>
                  ) : null}
                  <span className="bg-border/[0.72] h-3 w-px" />
                  <Mono size={10} className="text-muted-foreground">
                    {task.id}
                  </Mono>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="icon-sm" variant="ghost" aria-label="删除任务" onClick={function () { setConfirm(true); }}>
                  <Icon.Trash2 size={14} strokeWidth={2} />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="关闭详情" onClick={close}>
                  <Icon.X size={14} strokeWidth={2} />
                </Button>
              </div>
            </div>


            <div className="kd-dock-body">
              <div className="kd-dock-cols mx-auto w-full max-w-4xl">
                <div className="kd-main">
                  <section className="flex flex-col gap-2">
                    <SectionHead
                      title="子任务"
                      right={task.subtasks.length ? <Mono size={10}>{subDone + " / " + task.subtasks.length}</Mono> : undefined}
                    />
                    <div className="flex flex-col">
                      {task.subtasks.map(function (s) {
                        return (
                          <SubtaskRow
                            key={s.id}
                            sub={s}
                            onToggle={function () {
                              pushSubs(
                                task.subtasks.map(function (x) {
                                  return x.id === s.id ? { id: x.id, title: x.title, done: !x.done } : x;
                                })
                              );
                            }}
                            onRename={function (title) {
                              pushSubs(
                                task.subtasks.map(function (x) {
                                  return x.id === s.id ? { id: x.id, title: title, done: x.done } : x;
                                })
                              );
                            }}
                            onRemove={function () {
                              pushSubs(
                                task.subtasks.filter(function (x) {
                                  return x.id !== s.id;
                                })
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon.Plus size={13} strokeWidth={2} className="shrink-0 text-muted-foreground" />
                      <input
                        value={draftSub}
                        placeholder="加一个子任务，回车"
                        aria-label="新增子任务"
                        onChange={function (e) {
                          setDraftSub(e.target.value);
                        }}
                        onKeyDown={function (e) {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSub();
                          }
                        }}
                        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                      />
                      <SubtaskMeter done={subDone} total={task.subtasks.length} />
                    </div>
                  </section>

                  <section className="flex flex-col gap-2">
                    <SectionHead title="备注" />
                    <textarea
                      rows={3}
                      value={notes}
                      placeholder="写点上下文、链接、下一步…"
                      aria-label="备注"
                      onChange={function (e) {
                        setNotes(e.target.value);
                      }}
                      className="w-full resize-none bg-transparent text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </section>
                  <section className="flex flex-col gap-2">
                    <SectionHead title="贴图" />
                    <div className="flex w-full flex-col gap-2">
                      <div
                        className="kd-drop"
                        title="粘贴截图 / 拖入图片 / 点击选择"
                        onClick={function () {
                          if (fileRef.current) fileRef.current.click();
                        }}
                        onDragOver={function (e) {
                          e.preventDefault();
                        }}
                        onDrop={function (e) {
                          e.preventDefault();
                          void attach(imageFilesFrom(e.dataTransfer));
                        }}
                      >
                        {imgs.length
                          ? imgs.map(function (im) {
                              const src = imgData[im.id];
                              return (
                                <span key={im.id} className="kd-thumb-wrap">
                                  {src ? (
                                    <img
                                      src={src}
                                      alt=""
                                      className="kd-thumb"
                                      onClick={function (e) {
                                        e.stopPropagation();
                                        setZoom(src);
                                      }}
                                    />
                                  ) : (
                                    <span className="kd-thumb kd-thumb-empty" />
                                  )}
                                  <button
                                    type="button"
                                    aria-label="移除图片"
                                    className="kd-thumb-x"
                                    onClick={function (e) {
                                      e.stopPropagation();
                                      void actions.removeImage(task.id, im.id);
                                    }}
                                  >
                                    <Icon.X size={10} strokeWidth={2.4} />
                                  </button>
                                </span>
                              );
                            })
                          : null}
                        <span className="kd-drop-hint">
                          {imgBusy ? "正在处理图片…" : imgs.length ? "继续添加" : "粘贴截图、拖入，或点击选择"}
                        </span>
                      </div>
                      {imgErr ? <span className="text-destructive" style={{ fontSize: "11px" }}>{imgErr}</span> : null}
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={function (e) {
                          const files = Array.from(e.target.files || []);
                          e.target.value = "";
                          void attach(files);
                        }}
                      />
                    </div>
                  </section>
                </div>

                <div className="kd-rail">
                  <Prop label="优先级">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4].map(function (p) {
                        const on = task.priority === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={function () {
                              edit({ priority: p });
                            }}
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 font-mono transition-colors",
                              on ? "border-foreground bg-foreground text-background" : CHIP_OFF
                            )}
                            style={{ fontSize: "10.5px" }}
                          >
                            {"P" + String(p)}
                          </button>
                        );
                      })}
                      <PriorityGlyph priority={task.priority} className="ml-1.5" />
                    </div>
                  </Prop>

                  <Prop label="日期">
                    <div className="flex w-full flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-7 shrink-0 font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
                          起始
                        </span>
                        <DatePicker
                          value={task.starts ? parseKey(task.starts) : undefined}
                          placeholder="未设"
                          onChange={function (d) {
                            edit({ starts: d ? dateKey(d) : null });
                          }}
                        />
                        {task.starts ? (
                          <button
                            type="button"
                            aria-label="清除起始日"
                            onClick={function () {
                              edit({ starts: null });
                            }}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Icon.X size={11} strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-7 shrink-0 font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
                          截止
                        </span>
                        <DatePicker
                          value={task.due ? parseKey(task.due) : undefined}
                          placeholder="未设"
                          onChange={function (d) {
                            edit({ due: d ? dateKey(d) : null });
                          }}
                        />
                        {task.due ? (
                          <button
                            type="button"
                            aria-label="清除截止日"
                            onClick={function () {
                              edit({ due: null });
                            }}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Icon.X size={11} strokeWidth={2} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </Prop>

                  <Prop label="时间">
                    <input
                      type="time"
                      aria-label="开始时间"
                      className="kd-time"
                      value={task.startTime || ""}
                      onChange={function (e) {
                        edit({ startTime: e.target.value || null });
                      }}
                    />
                    <span className="px-1 text-muted-foreground">–</span>
                    <input
                      type="time"
                      aria-label="结束时间"
                      className="kd-time"
                      value={task.endTime || ""}
                      onChange={function (e) {
                        edit({ endTime: e.target.value || null });
                      }}
                    />
                    {task.startTime || task.endTime ? (
                      <button
                        type="button"
                        aria-label="清除时间"
                        onClick={function () {
                          edit({ startTime: null, endTime: null });
                        }}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Icon.X size={12} strokeWidth={2} />
                      </button>
                    ) : null}
                  </Prop>

                  <Prop label="标签">
                    <TagInput
                      value={task.tags}
                      placeholder="加标签"
                      onChange={function (v) {
                        edit({ tags: v });
                      }}
                    />
                  </Prop>


                  <div className="pt-5">
                    <Micro>快捷</Micro>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {QUICK_DUE.map(function (q) {
                        const key = shiftKey(today, q.days);
                        return (
                          <button
                            key={q.label}
                            type="button"
                            onClick={function () {
                              edit({ due: key, starts: task.starts && task.starts > key ? null : task.starts });
                            }}
                            className={cn(
                              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                              task.due === key ? "border-foreground bg-foreground text-background" : CHIP_OFF
                            )}
                          >
                            {q.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={function () {
                          if (isSpan) {
                            edit({ starts: null });
                          } else {
                            const start = task.starts || task.due || today;
                            const end = task.due && task.due > start ? task.due : shiftKey(start, 2);
                            edit({ starts: start, due: end });
                          }
                        }}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                          isSpan ? "border-foreground bg-foreground text-background" : CHIP_OFF
                        )}
                      >
                        跨天
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={confirm}
        title="删除这条任务？"
        description="删除后列表底部会出现撤销条，可原样恢复。"
        confirmLabel="删除"
        onOpenChange={setConfirm}
        onConfirm={function () {
          setConfirm(false);
          if (task) void actions.remove(task.id);
        }}
      />

      {zoom ? (
        <div
          className="kd-zoom"
          role="button"
          aria-label="关闭大图"
          onClick={function () {
            setZoom(null);
          }}
        >
          <img src={zoom} alt="" className="kd-zoom-img" />
        </div>
      ) : null}
    </React.Fragment>
  );
}
