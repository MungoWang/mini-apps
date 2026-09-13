import * as React from "react";

// the rule is stretched to whatever width the row has, so a 4-crest path flattened out into a
// straight line. 40 crests across the same 120 units keep the wavelength near 20px at any width.
function wavePathAt(y: number, amp: number, up: boolean, width = 120, crests = 14): string {
  let d = "M0 " + String(y);
  const step = width / crests;
  for (let i = 0; i < crests; i++) {
    const peak = i % 2 === 0;
    d += " q" + String(step / 2) + " " + (peak === up ? String(-amp) : String(amp)) + " " + String(step) + " 0";
  }
  return d;
}
// hairline waves in the rule (small amp)
function wavePath(up: boolean): string {
  return wavePathAt(5, 1.35, up, 120, 14);
}
const WAVE_UP = wavePath(true);
const WAVE_DOWN = wavePath(false);

import { motion, useMotionValue, useSpring } from "motion/react";

import {
  AppShell,
  Button,
  Icon,
  Kbd,
  PageHeader,
  cn,
  toast,
  useApp,
  ConfirmDialog,
} from "@monkey-mini-app/ui";

import { computeStats, todayKey } from "./shared/model";
import type { Pack, Priority, SortId, Task, ViewId } from "./shared/types";
import { Micro, Mono, TickBar } from "./ui/atoms";
import { BoardView } from "./ui/board";
import { TaskDetail } from "./ui/detail";
import { NavBar } from "./ui/navbar";
import { VIEWS, VIEW_META } from "./ui/nav";
import { Palette } from "./ui/palette";
import { QuickAdd } from "./ui/quick-add";
import { StatsView } from "./ui/stats";
import { TaskList } from "./ui/task-list";
import { SKIN } from "./ui/skin";
import { StoreCtx } from "./ui/store";
import type { Actions, Store } from "./ui/store";

// a completed task stays in place for this long so a misclick is one click to undo
const GRACE_MS = 5000;

const CHIP_SPRING = { type: "spring" as const, stiffness: 420, damping: 19, mass: 0.45 };

// Filter chips lean a few pixels toward the cursor and spring back when it leaves — that
// attraction is what makes the hover read as magnetic rather than as a plain scale-up.
function MagneticChip(props: React.ComponentPropsWithoutRef<"button">) {
  const { className, style, children, ...rest } = props;
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, CHIP_SPRING);
  const y = useSpring(my, CHIP_SPRING);
  return (
    <motion.button
      {...rest}
      type="button"
      className={className}
      style={{ ...style, x, y }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={CHIP_SPRING}
      onPointerMove={function (e) {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - (r.left + r.width / 2)) / r.width) * 6);
        my.set(((e.clientY - (r.top + r.height / 2)) / r.height) * 6);
      }}
      onHoverEnd={function () {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.button>
  );
}

const SORTS: { id: SortId; label: string; title: string }[] = [
  { id: "manual", label: "手动", title: "手动排序 · 可直接拖动行" },
  { id: "due", label: "截止", title: "按截止时间排序" },
  { id: "priority", label: "优先", title: "按优先级排序" },
  { id: "created", label: "创建", title: "按创建时间排序" },
];

const PRIO_CHIPS: { value: Priority; label: string }[] = [
  { value: 1, label: "P1" },
  { value: 2, label: "P2" },
  { value: 3, label: "P3" },
  { value: 4, label: "P4" },
];

export default function Ui() {
  const { call } = useApp();

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [tags, setTags] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [view, setView] = React.useState<ViewId>("today");
  const [sort, setSort] = React.useState<SortId>("manual");
  const [query, setQuery] = React.useState("");
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);
  const [prioFilter, setPrioFilter] = React.useState<Priority[]>([]);
  // hovering a tag dry-runs the filter: the list fades everything that would drop out
  const [hoverTag, setHoverTag] = React.useState<string | null>(null);
  const [hoverPrio, setHoverPrio] = React.useState<Priority | null>(null);
  // a hover preview must never be able to stick: clear it whenever the window loses focus
  React.useEffect(function () {
    function clear() {
      setHoverTag(null);
      setHoverPrio(null);
    }
    window.addEventListener("blur", clear);
    return function () {
      window.removeEventListener("blur", clear);
    };
  }, []);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectMode, setSelectMode] = React.useState(false);
  const [chosen, setChosen] = React.useState<string[]>([]);
  const [assistOpen, setAssistOpen] = React.useState(false);
  const [graceIds, setGraceIds] = React.useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [confirmClear, setConfirmClear] = React.useState(false);
  // remembered across reloads; a blocked localStorage just falls back to collapsed
  const [expandSubs, setExpandSubsState] = React.useState(function () {
    try {
      return window.localStorage.getItem("kedu.expandSubs") === "1";
    } catch (e) {
      return false;
    }
  });
  const setExpandSubs = React.useCallback(function (v: boolean) {
    setExpandSubsState(v);
    try {
      window.localStorage.setItem("kedu.expandSubs", v ? "1" : "0");
    } catch (e) {
      void e;
    }
  }, []);
  const [undo, setUndo] = React.useState<Task | null>(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [today, setToday] = React.useState(todayKey());

  const addRef = React.useRef<HTMLInputElement | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);
  const callRef = React.useRef(call);
  callRef.current = call;

  const apply = React.useCallback(function (pack: Pack) {
    if (pack && Array.isArray(pack.tasks)) setTasks(pack.tasks);
    if (pack && Array.isArray(pack.tags)) setTags(pack.tags);
  }, []);

  const run = React.useCallback(
    async function (method: string, args?: Record<string, unknown>) {
      setBusy(true);
      setError(null);
      try {
        const res = (await callRef.current(method, args || {})) as Pack;
        if (res && Array.isArray(res.tasks)) apply(res);
        return res;
      } catch (e) {
        const msg = String((e as { message?: string } | null)?.message || e);
        setError(msg);
        setError(msg);
        // toast is a progressive enhancement: in this host build it can throw, and an
        // unguarded call here would replace the real failure message with its own crash
        try {
          toast({ title: "操作没有成功", description: msg });
        } catch (err) {
          void err;
        }
        return null;
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  React.useEffect(function () {
    let alive = true;
    void (async function () {
      try {
        const res = (await callRef.current("list", {})) as Pack;
        if (alive && res && Array.isArray(res.tasks)) apply(res);
      } catch (e) {
        if (alive) setError(String((e as { message?: string } | null)?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return function () {
      alive = false;
    };
  }, [apply]);

  React.useEffect(function () {
    const timer = window.setInterval(function () {
      const k = todayKey();
      setToday(function (prev) {
        return prev === k ? prev : k;
      });
    }, 60000);
    return function () {
      window.clearInterval(timer);
    };
  }, []);

  React.useEffect(
    function () {
      if (!undo) return;
      const timer = window.setTimeout(function () {
        setUndo(null);
      }, 7000);
      return function () {
        window.clearTimeout(timer);
      };
    },
    [undo]
  );

  const actions: Actions = React.useMemo(
    function () {
      return {
        add: async function (raw: string) {
          const before: Record<string, boolean> = {};
          for (let i = 0; i < tasks.length; i++) before[tasks[i].id] = true;
          const res: any = await run("add", { title: raw });
          if (!res || !Array.isArray(res.tasks)) return null;
          const fresh = res.tasks.find(function (t: Task) {
            return !before[t.id];
          });
          return fresh ? fresh.id : null;
        },
        toggle: async function (id: string) {
          let wasDone = false;
          for (let i = 0; i < tasks.length; i++) if (tasks[i].id === id) wasDone = tasks[i].done;
          const res = await run("toggle", { id });
          if (!res) return;
          if (wasDone) {
            // un-checking cancels the grace window outright
            setGraceIds(function (prev) {
              return prev.filter(function (x) {
                return x !== id;
              });
            });
            return;
          }
          setGraceIds(function (prev) {
            return prev.indexOf(id) >= 0 ? prev : prev.concat([id]);
          });
          window.setTimeout(function () {
            setGraceIds(function (prev) {
              return prev.filter(function (x) {
                return x !== id;
              });
            });
          }, GRACE_MS);
        },
        patch: async function (id: string, patch: Record<string, unknown>) {
          await run("update", { id, patch });
        },
        remove: async function (id: string) {
          let snapshot: Task | null = null;
          for (let i = 0; i < tasks.length; i++) if (tasks[i].id === id) snapshot = tasks[i];
          const res = await run("remove", { id });
          if (res && snapshot) {
            setUndo(snapshot);
            setSelectedId(function (prev) {
              return prev === id ? null : prev;
            });
          }
        },
        undoRemove: async function () {
          if (!undo) return;
          await run("restore", { task: undo });
          setUndo(null);
        },
        reorder: async function (ids: string[]) {
          await run("reorder", { ids });
        },
        bulk: async function (ids: string[], action: "done" | "active" | "remove") {
          const res = await run("bulk", { ids, action });
          setChosen([]);
          if (!res) return;
          if (action === "active") {
            setGraceIds(function (prev) {
              return prev.filter(function (x) {
                return ids.indexOf(x) < 0;
              });
            });
            return;
          }
          if (action === "done") {
            setGraceIds(function (prev) {
              return prev.concat(
                ids.filter(function (x) {
                  return prev.indexOf(x) < 0;
                })
              );
            });
            window.setTimeout(function () {
              setGraceIds(function (prev) {
                return prev.filter(function (x) {
                  return ids.indexOf(x) < 0;
                });
              });
            }, GRACE_MS);
          }
        },
        clearDone: async function () {
          await run("clearDone", {});
        },
        addImage: async function (taskId: string, data: string, w: number, h: number) {
          await run("imageAdd", { taskId, data, w, h });
        },
        removeImage: async function (taskId: string, id: string) {
          await run("imageRemove", { taskId, id });
        },
        loadImages: async function (ids: string[]) {
          if (!ids.length) return {};
          const res: any = await run("imagesGet", { ids });
          return (res && typeof res === "object" ? res : {}) as Record<string, string>;
        },
        reset: async function () {
          await run("reset", {});
        },
      };
    },
    [run, tasks, undo]
  );

  const stats = React.useMemo(
    function () {
      return computeStats(tasks, today);
    },
    [tasks, today]
  );

  const toggleSelect = React.useCallback(function (id: string) {
    setChosen(function (prev) {
      return prev.indexOf(id) >= 0
        ? prev.filter(function (x) {
            return x !== id;
          })
        : prev.concat([id]);
    });
  }, []);

  const clearSelection = React.useCallback(function () {
    setChosen([]);
  }, []);

  const resetFilters = React.useCallback(function () {
    setQuery("");
    setTagFilter(null);
    setPrioFilter([]);
  }, []);

  const setSelectModeSafe = React.useCallback(function (v: boolean) {
    setSelectMode(v);
    if (!v) setChosen([]);
  }, []);

  const store: Store = React.useMemo(
    function () {
      return {
        tasks,
        tags,
        stats,
        today,
        view,
        setView,
        sort,
        setSort,
        query,
        setQuery,
        tagFilter,
        setTagFilter,
        prioFilter,
        setPrioFilter,
        hoverTag,
        setHoverTag,
        hoverPrio,
        setHoverPrio,
        selectedId,
        openTask: setSelectedId,
        selectMode,
        setSelectMode: setSelectModeSafe,
        chosen,
        toggleSelect,
        clearSelection,
        expandSubs,
        graceIds,
        assistOpen,
        setAssistOpen,
        actions,
      };
    },
    [
      tasks,
      tags,
      stats,
      today,
      view,
      sort,
      query,
      tagFilter,
      prioFilter,
      hoverTag,
      hoverPrio,
      selectedId,
      selectMode,
      chosen,
      toggleSelect,
      clearSelection,
      setSelectModeSafe,
      assistOpen,
      expandSubs,
      graceIds,
      actions,
    ]
  );

  React.useEffect(function () {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        Boolean(el) && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable === true);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        if (addRef.current) addRef.current.focus();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (/^[1-6]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < VIEWS.length) setView(VIEWS[idx].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return function () {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const meta = VIEW_META[view];
  const todayLoad = stats.dueToday + stats.doneToday;
  const todayRatio = todayLoad === 0 ? 0 : stats.doneToday / todayLoad;
  const hasFilters = Boolean(query.trim() || tagFilter || prioFilter.length > 0);
  // bulk actions follow the selection: no "标记完成" when everything picked is already done
  let chosenActive = 0;
  let chosenDone = 0;
  for (let ci = 0; ci < chosen.length; ci++) {
    for (let cj = 0; cj < tasks.length; cj++) {
      if (tasks[cj].id === chosen[ci]) {
        if (tasks[cj].done) chosenDone++;
        else chosenActive++;
      }
    }
  }

  return (
    <StoreCtx.Provider value={store}>
      <style>{SKIN}</style>
      <AppShell
        header={
          <div className={selectedId ? "kd-recede" : undefined}>
          <PageHeader
            title={meta.label}
            description={meta.desc}
            actions={
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={function () {
                    setPaletteOpen(true);
                  }}
                >
                  <Icon.Command size={13} strokeWidth={2} />
                  <span className="hidden sm:inline">命令</span>
                  <Kbd className="ml-1 hidden md:inline-flex">⌘K</Kbd>
                </Button>
                <Button
                  size="sm"
                  onClick={function () {
                    if (addRef.current) addRef.current.focus();
                  }}
                >
                  <Icon.Plus size={14} strokeWidth={2.2} />
                  <span className="hidden sm:inline">新建</span>
                </Button>
              </div>
            }
          />
          </div>
        }
      >
        <div className={cn("relative flex h-full min-h-0 flex-col gap-4", selectedId ? "kd-recede" : "")}>
          <div className={"flex shrink-0 items-center gap-3" + (todayLoad > 0 && stats.doneToday >= todayLoad ? " kd-today-full" : "")}>
            <Micro className="shrink-0">{todayLoad > 0 && stats.doneToday >= todayLoad ? "今日清空 ·" : "今日进度"}</Micro>
            <TickBar ratio={todayRatio} ticks={24} celebrate={todayLoad > 0 && stats.doneToday >= todayLoad} />
            {todayLoad > 0 && stats.doneToday >= todayLoad ? (
              <span className="kd-today-rule" aria-hidden="true">
                <svg className="kd-wave kd-wave-a" viewBox="0 0 120 10" preserveAspectRatio="none">
                  <path d={WAVE_UP} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
                <svg className="kd-wave kd-wave-b" viewBox="0 0 120 10" preserveAspectRatio="none">
                  <path d={WAVE_DOWN} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                </svg>
              </span>
            ) : (
              <span className="bg-border/[0.72] h-px flex-1" />
            )}
            <Mono size={11} className="kd-today-count shrink-0 text-muted-foreground">
              {String(stats.doneToday) + "/" + String(todayLoad)}
            </Mono>
            {stats.overdue ? (
              <Mono size={11} className="shrink-0 text-destructive">{"逾期 " + String(stats.overdue)}</Mono>
            ) : null}
          </div>

          <QuickAdd inputRef={addRef} />

          {/* everything below the input recedes while its picker is open */}
          <div className={cn("flex min-h-0 flex-1 flex-col gap-5", assistOpen ? "kd-dim" : "")}>
          <div
          className="kd-card border-border/[0.78] shrink-0 overflow-visible rounded-2xl border"
          onMouseOver={function (e) {
            const el = e.target as HTMLElement;
            const tag = el.closest("[data-tag]");
            const prio = el.closest("[data-prio]");
            setHoverTag(tag ? tag.getAttribute("data-tag") : null);
            setHoverPrio(prio ? (Number(prio.getAttribute("data-prio")) as Priority) : null);
          }}
          onMouseLeave={function () {
            setHoverTag(null);
            setHoverPrio(null);
          }}
        >
          <NavBar />

          {/* Panel body: every filter lives in ONE band, so the panel reads as header + body
              instead of three stacked stripes. Search is a normal-width field, not the hero —
              tags and priority are peers, and the tags keep the quieter treatment. */}
          <div className="kd-filters">
            <div className="kd-filters-mini">
              <Icon.Search size={13} strokeWidth={2} className="shrink-0 text-muted-foreground" />
              {hasFilters ? (
                <span className="flex flex-wrap items-center gap-1.5 overflow-hidden">
                  {prioFilter.map(function (p) {
                    return <span key={p} className="kd-filters-chip">{"P" + String(p)}</span>;
                  })}
                  {tagFilter ? <span className="kd-filters-chip">{"#" + tagFilter}</span> : null}
                  {query.trim() ? <span className="kd-filters-chip">{"“" + query.trim() + "”"}</span> : null}
                </span>
              ) : (
                <span className="text-muted-foreground" style={{ fontSize: "12.5px" }}>搜索或筛选…</span>
              )}
              <span className="flex-1" />
            </div>
            <div className="kd-filters-body">
            <div className="kd-filters-full">
            <div className="flex flex-col gap-2.5 px-4 pb-3 pt-5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative" style={{ flex: "1 1 260px", minWidth: 140, maxWidth: 520 }}>
                  <Icon.Search size={13} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  <input
                    ref={searchRef}
                    value={query}
                    placeholder="搜索或筛选…"
                    onChange={function (e) {
                      setQuery(e.target.value);
                    }}
                    className="kd-input pl-[34px] h-8 w-full rounded-lg border border-input bg-transparent pr-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground"
                  />
                </div>
  
                {stats.tags.length ? (
                  <button
                    type="button"
                    title="展开筛选：优先级与标签"
                    aria-expanded={filtersOpen}
                    onClick={function () {
                      setFiltersOpen(!filtersOpen);
                    }}
                    className={cn(
                      "kd-ghost kd-filterbtn shrink-0 items-center gap-1.5 rounded-md border px-2 py-2 transition-colors",
                      hasFilters || filtersOpen
                        ? "border-foreground text-foreground"
                        : "border-border/[0.78] text-muted-foreground hover:border-foreground hover:text-foreground"
                    )}
                    style={{ fontSize: "10.5px" }}
                  >
                    <Icon.Filter size={11} strokeWidth={1.9} />
                    {tagFilter ? "#" + tagFilter : prioFilter.length === 1 ? "P" + String(prioFilter[0]) : prioFilter.length ? "优先 " + String(prioFilter.length) : query.trim() ? "搜索" : "筛选"}
                  </button>
                ) : null}
  
                {hasFilters ? (
                  <Button size="xs" variant="ghost" onClick={resetFilters}>
                    <Icon.X size={11} strokeWidth={2} /> 清除筛选
                  </Button>
                ) : null}
              </div>
  
              <div className="kd-filterrow flex flex-wrap items-center gap-x-3 gap-y-2" data-open={filtersOpen ? "true" : "false"}>
                <div className="flex items-center gap-x-1.5" role="group" aria-label="优先级筛选">
                  {PRIO_CHIPS.map(function (c) {
                    const active = prioFilter.indexOf(c.value) >= 0;
                    const stat = stats.byPriority.find(function (b) {
                      return b.priority === c.value;
                    });
                    const n = stat ? stat.count : 0;
                    return (
                      <MagneticChip
                        key={c.label}
                        type="button"
                        title={"只看 " + c.label + " · 可多选"}
                        aria-pressed={active}
                        data-prio={c.value}
                        onFocus={function () {
                          setHoverPrio(c.value);
                        }}
                        onBlur={function () {
                          setHoverPrio(null);
                        }}
                        onClick={function () {
                          setPrioFilter(
                            active
                              ? prioFilter.filter(function (x) {
                                  return x !== c.value;
                                })
                              : prioFilter.concat([c.value])
                          );
                        }}
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono transition-colors",
                          active
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                        style={{ fontSize: "10.5px" }}
                      >
                        {"P" + String(c.value)}
                        {n ? <span className="ml-[5px] tabular-nums opacity-[0.45]">{n}</span> : null}
                      </MagneticChip>
                    );
                  })}
                </div>
  
                <span className="h-3.5 w-px shrink-0 bg-border/[0.72]" />
  
                {stats.tags.length ? (
                  <div className="kd-tagblock flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {stats.tags.map(function (t) {
                    const on = tagFilter === t.name;
                    return (
                      <MagneticChip
                        key={t.name}
                        type="button"
                        onClick={function () {
                          setTagFilter(on ? null : t.name);
                        }}
                        data-tag={t.name}
                        onFocus={function () {
                          setHoverTag(t.name);
                        }}
                        onBlur={function () {
                          setHoverTag(null);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono transition-colors",
                          on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                        style={{ fontSize: "10.5px" }}
                      >
                        {"#" + t.name}
                        {t.count ? <span className="ml-[5px] tabular-nums opacity-[0.45]">{t.count}</span> : null}
                      </MagneticChip>
                    );
                  })}
                  </div>
                ) : null}
            </div>
              </div>
            </div>
            </div>
          </div>

          </div>

          {/* list toolbar: these act on the list right below them */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-1">
            <Micro className="shrink-0">排序</Micro>
            <div className="kd-seg" role="group" aria-label="排序方式">
              {SORTS.map(function (s) {
                const on = sort === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    title={s.title}
                    aria-pressed={on}
                    data-on={on ? "true" : "false"}
                    onClick={function () {
                      setSort(s.id);
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              title="默认展开所有子任务"
              aria-pressed={expandSubs}
              onClick={function () {
                setExpandSubs(!expandSubs);
              }}
              className={cn(
                "kd-ghost inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
                expandSubs
                  ? "kd-lit border-foreground"
                  : "border-border/[0.78] text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
              style={{ fontSize: "10.5px" }}
            >
              <Icon.List size={11} strokeWidth={2} />
              子任务
            </button>
            <button
              type="button"
              title="进入选择模式，可批量完成或删除"
              aria-pressed={selectMode}
              onClick={function () {
                setSelectModeSafe(!selectMode);
              }}
              className={cn(
                "kd-ghost inline-flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
                selectMode
                  ? "kd-lit border-foreground"
                  : "border-border/[0.78] text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
              style={{ fontSize: "10.5px" }}
            >
              <Icon.CheckSquare size={11} strokeWidth={2} />
              选择
            </button>

            {chosen.length ? (
              <span className="kd-bulkbar">
                <Mono size={11} className="text-muted-foreground">{String(chosen.length) + " 项已选"}</Mono>
                {chosenActive ? (
                  <Button size="xs" variant="outline" onClick={function () { void actions.bulk(chosen, "done"); }}>
                    标记完成
                  </Button>
                ) : null}
                {chosenDone ? (
                  <Button size="xs" variant="outline" onClick={function () { void actions.bulk(chosen, "active"); }}>
                    取消完成
                  </Button>
                ) : null}
                <Button size="xs" variant="outline" onClick={function () { void actions.bulk(chosen, "remove"); }}>
                  <Icon.Trash2 size={12} strokeWidth={2} /> 删除
                </Button>
                <Button size="xs" variant="ghost" onClick={clearSelection}>
                  取消选择
                </Button>
              </span>
            ) : null}

            <span className="flex-1" />

            {stats.done ? (
              <button
                type="button"
                title={"清理 " + String(stats.done) + " 项已完成任务"}
                onClick={function () {
                  setConfirmClear(true);
                }}
                className="kd-ghost border-border/[0.78] inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                style={{ fontSize: "10.5px" }}
              >
                <Icon.Archive size={11} strokeWidth={1.9} />
                {"清理已完成 " + String(stats.done)}
              </button>
            ) : null}
          </div>


          {error ? <p className="shrink-0 text-xs text-destructive">{error}</p> : null}

          <div className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              {[0, 1, 2, 3, 4].map(function (i) {
                return <div key={i} className="border-border/[0.78] bg-muted/45 h-11 animate-pulse rounded-2xl border" />;
              })}
            </div>
          ) : view === "board" ? (
            <BoardView />
          ) : view === "stats" ? (
            <StatsView />
          ) : (
            <TaskList />
          )}
          </div>
          </div>

          {undo ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-4">
              <div className="kd-card-hi border-border/[0.78] pointer-events-auto flex max-w-full items-center gap-3 rounded-full border py-1.5 pl-4 pr-2 shadow-lg">
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {"已删除「" + undo.title + "」"}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={function () {
                    void actions.undoRemove();
                  }}
                >
                  撤销
                </Button>
              </div>
            </div>
          ) : null}

          {busy ? (
            <span
            className="pointer-events-none absolute right-0 top-0 font-mono uppercase tracking-widest text-muted-foreground"
            style={{ fontSize: "9px" }}
          >
              同步中
            </span>
          ) : null}
        </div>
      </AppShell>

      <TaskDetail />
      <Palette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ConfirmDialog
        open={confirmClear}
        title={"清理已完成的 " + String(stats.done) + " 项任务？"}
        description="这些任务会被【永久删除】，无法撤销。请到「已完成」分组下核对是否需要留档。"
        confirmLabel="永久清理"
        onOpenChange={setConfirmClear}
        onConfirm={function () {
          setConfirmClear(false);
          void actions.clearDone();
        }}
      />
    </StoreCtx.Provider>
  );
}
