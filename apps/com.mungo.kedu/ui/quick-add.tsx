import * as React from "react";
import { Button, Icon, Kbd, MiniCalendar, cn } from "@monkey-mini-app/ui";

import { dateKey, fmtShort, fullDate, parseDueToken, parseKey, parseQuickAdd, scheduleOf, shiftKey } from "../shared/model";
import { InboxMark, Micro, Mono, PriorityGlyph, TagPill } from "./atoms";
import { imageFilesFrom, shrinkImage } from "./image-utils";
import { inView, parseQuickAdd, shiftKey } from "../shared/model";
import { useStore } from "./store";

const PRIORITY_TEXT: Record<number, string> = { 1: "P1 紧急", 2: "P2 高", 3: "P3 中", 4: "P4 低" };

type Kind = "due" | "tag" | "prio";
type Assist = { kind: Kind; start: number; end: number; query: string };
type Item = { key: string; label: string; hint?: string; run: () => void };

// every entry inserts a token the parser understands, so the raw text stays readable
function shortcuts(today: string): { label: string; token: string; days: number }[] {
  const cur = parseKey(today).getDay();
  const toSat = (6 - cur + 7) % 7;
  return [
    { label: "今天", token: "@今天", days: 0 },
    { label: "明天", token: "@明天", days: 1 },
    { label: "后天", token: "@后天", days: 2 },
    { label: "三天后", token: "@3天后", days: 3 },
    { label: "本周末", token: "@本周末", days: toSat },
    { label: "一周后", token: "@7天后", days: 7 },
    { label: "两周后", token: "@14天后", days: 14 },
  ];
}

const MARKERS: { code: string; text: string }[] = [
  { code: "!1", text: "优先级，!1 最高到 !4 最低（也可写 p1）" },
  { code: "#工作", text: "标签，可以写多个，每个最多 16 个字" },
  { code: "@明天", text: "截止日：今天 / 明天 / 后天 / 大后天 / 3天后" },
  { code: "@本周末", text: "周末：本周末 / 下周末；也可写 @周末" },
  { code: "@9/13-9/15", text: "跨天区间：两个日期用 - 或 ~ 连起来" },
  { code: "@14:00-15:30", text: "时间区间：单独写 @14:00 也可以" },
  { code: "@周五", text: "星期几：周五、周日；加上「下」表示下一周" },
  { code: "@9-20", text: "具体日期：9/20 或 2026-09-20，过完自动算明年" },
  { code: "回车", text: "加入清单；候选框打开时回车先选中候选" },
  { code: "N", text: "在任意位置把光标送回这里" },
];

function kindOf(marker: string): Kind {
  if (marker === "#") return "tag";
  if (marker === "!") return "prio";
  return "due";
}

// the panel is resizable, so the popup picks a layout from the live width:
// narrow -> stacked, wide -> options and the calendar share the row
function useRoomy(ref: React.RefObject<HTMLDivElement | null>, min: number): boolean {
  const [roomy, setRoomy] = React.useState(true);
  React.useEffect(
    function () {
      const el = ref.current;
      if (!el) return;
      const check = function () {
        setRoomy(el.getBoundingClientRect().width >= min);
      };
      check();
      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", check);
        return function () {
          window.removeEventListener("resize", check);
        };
      }
      const ro = new ResizeObserver(check);
      ro.observe(el);
      return function () {
        ro.disconnect();
      };
    },
    [ref, min]
  );
  return roomy;
}

function popupShell(kind: Kind, wide: boolean): string {
  return kind === "due" && wide ? "flex items-start gap-3" : "flex flex-col gap-3";
}

export function QuickAdd(props: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const { actions, tasks, today, tags, stats, setAssistOpen, setView, openTask } = useStore();
  const [raw, setRaw] = React.useState("");
  // the capture bucket: untriaged = no date and no tags. The zone only exists while there is
  // something to sort, and it doubles as the drop target for the throw animation.
  let inboxCount = 0;
  const inboxTasks: typeof tasks = [];
  for (let ii = 0; ii < tasks.length; ii++) {
    if (inView(tasks[ii], "inbox", today)) {
      inboxCount++;
      inboxTasks.push(tasks[ii]);
    }
  }
  const [triage, setTriage] = React.useState(false);
  const [cursor, setCursor] = React.useState(0);
  const [pick, setPick] = React.useState<{ id: string; kind: "tag" | "date" } | null>(null);
  // browse: ↑↓ picks the task, and whatever the cursor is on is the one expanded.
  // select: Enter locks onto it and the arrows move between the action groups / their items.
  const [mode, setMode] = React.useState<"browse" | "select">("browse");
  const [group, setGroup] = React.useState(0);
  const [item, setItem] = React.useState(0);
  const [closing, setClosing] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const anchorTop = React.useRef<number | null>(null);
  const [notesDraft, setNotesDraft] = React.useState<string | null>(null);
  const notesRef = React.useRef<HTMLTextAreaElement | null>(null);

  function closePanel() {
    setClosing(true);
    window.setTimeout(function () {
      setTriage(false);
      setClosing(false);
      setMode("browse");
    }, 230);
  }

  // scroll anchoring: when the accordion opens or closes the list changes height, so compensate
  // scrollTop to keep the row the user is looking at exactly where it was on screen
  React.useLayoutEffect(
    function () {
      const list = listRef.current;
      if (!list) return;
      const rows = list.querySelectorAll(".kd-triage-row");
      const row = rows[cursor] as HTMLElement | undefined;
      if (!row) return;
      const top = row.getBoundingClientRect().top;
      if (anchorTop.current !== null) {
        const delta = top - anchorTop.current;
        if (delta !== 0) list.scrollTop = list.scrollTop + delta;
      }
      anchorTop.current = top;
    },
    [cursor, mode]
  );

  // keep the cursor row in view, but never scroll when it is already visible
  React.useEffect(
    function () {
      if (!triage) return;
      const rows = document.querySelectorAll(".kd-triage-row");
      const el = rows[cursor] as HTMLElement | undefined;
      if (el) el.scrollIntoView({ block: "nearest" });
    },
    [cursor, triage]
  );

  // the panel is the keyboard surface: it has to actually own focus when it opens, otherwise
  // key events never reach it (typing on the page does nothing)
  React.useEffect(
    function () {
      if (triage && !closing) {
        const el = panelRef.current;
        if (el && document.activeElement !== el) el.focus();
      }
    },
    [triage, closing, mode]
  );
  // the batch the panel opened with: rows stay listed (marked 已归类) so several attributes can be
  // set without anything vanishing mid-way
  const [session, setSession] = React.useState<string[]>([]);
  // the tag order is frozen when the panel opens: stats.tags is sorted by count, so reading it
  // live made the chip you just clicked jump to a new position on the next toggle
  const [tagList, setTagList] = React.useState<string[]>([]);
  const zoneRef = React.useRef<HTMLButtonElement | null>(null);

  // the capture is thrown into the bucket — only when it truly lands there (no date, no tag)
  // the bucket only mounts once there is something to triage, so on the very first capture the
  // target does not exist yet: wait (and retry) for it to animate in before flying anything
  function throwIntoBucket(text: string, tries: number) {
    const input = props.inputRef.current;
    const zone = zoneRef.current;
    if (!input || !zone) {
      if (tries > 0) {
        window.setTimeout(function () {
          throwIntoBucket(text, tries - 1);
        }, 90);
      }
      return;
    }
    const from = input.getBoundingClientRect();
    const to = zone.getBoundingClientRect();
    const chip = document.createElement("span");
    chip.className = "kd-throwchip";
    chip.textContent = text;
    document.body.appendChild(chip);
    const anim = chip.animate(
      [
        { transform: "translate(" + String(Math.round(from.left - 4)) + "px," + String(Math.round(from.top + from.height / 2 - 14)) + "px) scale(1) rotate(0deg)", opacity: "1" },
        {
          transform:
            "translate(" + String(Math.round((from.left + to.left) / 2)) + "px," + String(Math.round(from.top - 86)) + "px) scale(1.06) rotate(-7deg)",
          opacity: "1",
          offset: 0.45,
        },
        { transform: "translate(" + String(Math.round(to.left + to.width / 2 - 34)) + "px," + String(Math.round(to.top + to.height / 2 - 14)) + "px) scale(.7) rotate(9deg)", opacity: ".12" },
      ],
      { duration: 520, easing: "cubic-bezier(.4,.05,.6,.95)", fill: "forwards" }
    );
    anim.onfinish = function () {
      chip.remove();
    };
    zone.classList.add("kd-inboxzone-hit");
    window.setTimeout(function () {
      zone.classList.remove("kd-inboxzone-hit");
    }, 1080);
  }
  // images pasted here ride along onto whatever task this input creates
  const [shots, setShots] = React.useState<{ data: string; w: number; h: number }[]>([]);
  const [shotBusy, setShotBusy] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [assist, setAssist] = React.useState<Assist | null>(null);
  const [index, setIndex] = React.useState(0);
  const indexRef = React.useRef(0);
  const [help, setHelp] = React.useState(false);
  const [editEnd, setEditEnd] = React.useState<"due" | "starts">("due");
  const caretRef = React.useRef<number | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const wide = useRoomy(wrapRef, 620);

  const parsed = React.useMemo(
    function () {
      return parseQuickAdd(raw, today);
    },
    [raw, today]
  );
  const due = scheduleOf(parsed, today);
  const canAdd = parsed.title.length > 0;

  const tagCounts = React.useMemo(
    function () {
      const map: Record<string, number> = {};
      for (let i = 0; i < stats.tags.length; i++) map[stats.tags[i].name] = stats.tags[i].count;
      return map;
    },
    [stats.tags]
  );

  React.useEffect(function () {
    if (caretRef.current === null) return;
    const el = props.inputRef.current;
    const pos = caretRef.current;
    caretRef.current = null;
    if (el) {
      el.focus();
      el.setSelectionRange(pos, pos);
    }
  }, [raw]);

  React.useEffect(
    function () {
      setAssistOpen(Boolean(assist) || help);
    },
    [assist, help, setAssistOpen]
  );

  React.useEffect(function () {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && e.target instanceof Node && wrapRef.current.contains(e.target)) return;
      setHelp(false);
      setAssist(null);
    }
    document.addEventListener("mousedown", onDown);
    return function () {
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  function sync(value: string, caret: number | null) {
    const at = caret === null ? value.length : caret;
    let start = at;
    while (start > 0 && !/\s/.test(value.charAt(start - 1))) start--;
    const chunk = value.slice(start, at);
    if (chunk.length === 0) {
      setAssist(null);
      return;
    }
    const head = chunk.charAt(0);
    if (head !== "@" && head !== "#" && head !== "!") {
      setAssist(null);
      return;
    }
    const query = chunk.slice(1);
    // once the token is already unambiguous, get out of the way so Enter submits
    if (head === "@" && parseDueToken(query, today)) {
      setAssist(null);
      return;
    }
    if (head === "!" && /^[!！]?[1-4]$/.test(chunk)) {
      setAssist(null);
      return;
    }
    let end = at;
    while (end < value.length && !/\s/.test(value.charAt(end))) end++;
    setAssist({ kind: kindOf(head), start, end, query });
    focusIndex(0);
  }

  // keepOpen is used while a range is assembled: the token is rewritten in place and the
  // assist offsets move with it, so the next pick replaces the same token
  function applyToken(token: string, keepOpen?: boolean) {
    if (!assist) return;
    const before = raw.slice(0, assist.start);
    const after = raw.slice(assist.end);
    const gap = after.length === 0 || /^\s/.test(after) ? "" : " ";
    const inserted = before + token + gap;
    caretRef.current = inserted.length;
    setRaw(inserted + after);
    focusIndex(0);
    if (keepOpen) {
      setAssist({ kind: assist.kind, start: before.length, end: before.length + token.length, query: "" });
    } else {
      setAssist(null);
    }
  }

  function rangeToken(starts: string | null, ends: string | null): string {
    if (starts && ends && starts !== ends) {
      const a = starts < ends ? starts : ends;
      const b = starts < ends ? ends : starts;
      return "@" + fmtShort(a) + "-" + fmtShort(b);
    }
    if (ends) return "@" + fmtShort(ends);
    if (starts) return "@" + fmtShort(starts);
    return "";
  }

  function pickDate(key: string) {
    const starts = editEnd === "starts" ? key : parsed.starts;
    const ends = editEnd === "due" ? key : parsed.due;
    const token = rangeToken(starts, ends);
    if (!token) return;
    const complete = Boolean(starts && ends && starts !== ends);
    applyToken(token, editEnd === "starts" && !complete);
    if (editEnd === "starts") setEditEnd("due");
  }

  function removeToken() {
    if (!assist) return;
    const next = (raw.slice(0, assist.start) + raw.slice(assist.end)).replace(/\s+/g, " ").trim();
    caretRef.current = next.length;
    setRaw(next);
    setAssist(null);
    focusIndex(0);
  }

  // the highlighted row lives in a ref as well: several keydowns can land in one React
  // batch, and Enter must read the newest index instead of a stale render closure
  function focusIndex(next: number) {
    const clamped = Math.max(0, Math.min(next, items.length - 1));
    indexRef.current = clamped;
    setIndex(clamped);
  }

  function moveIndex(delta: number) {
    focusIndex(indexRef.current + delta);
  }

  function insertMarker(marker: string) {
    const el = props.inputRef.current;
    const focused = el !== null && document.activeElement === el;
    const at = focused && el && el.selectionStart !== null ? el.selectionStart : raw.length;
    const before = raw.slice(0, at);
    const after = raw.slice(at);
    const lead = before.length === 0 || /\s$/.test(before) ? "" : " ";
    const inserted = before + lead + marker;
    caretRef.current = inserted.length;
    setRaw(inserted + after);
    setHelp(false);
    setAssist({ kind: kindOf(marker), start: inserted.length - marker.length, end: inserted.length, query: "" });
    focusIndex(0);
  }

  const items: Item[] = [];
  if (assist) {
    if (assist.kind === "prio") {
      for (let p = 1; p <= 4; p++) {
        const value = p;
        items.push({
          key: "p" + String(p),
          label: PRIORITY_TEXT[p],
          hint: parsed.priority === value ? "当前" : "",
          run: function () {
            applyToken("!" + String(value));
          },
        });
      }
    } else if (assist.kind === "due") {
      const isSpan = Boolean(parsed.starts && parsed.due && parsed.starts !== parsed.due);
      const opts = shortcuts(today);
      for (let i = 0; i < opts.length; i++) {
        const o = opts[i];
        const key = shiftKey(today, o.days);
        items.push({
          key: "d" + o.token,
          label: o.label,
          hint: key.slice(5).replace("-", "/"),
          run: function () {
            pickDate(key);
          },
        });
      }
      items.push({
        key: "dspan",
        label: editEnd === "starts" ? "正在选开始日 · 点日历" : isSpan ? "改开始日" : "设为跨天",
        hint: isSpan && editEnd === "due" ? "区间" : "",
        run: function () {
          if (editEnd === "starts") {
            setEditEnd("due");
            return;
          }
          if (!isSpan) {
            const base = parsed.due || today;
            applyToken("@" + fmtShort(base) + "-" + fmtShort(shiftKey(base, 2)), true);
          }
          setEditEnd("starts");
        },
      });
      items.push({
        key: "dclear",
        label: "清除日期",
        run: function () {
          setEditEnd("due");
          removeToken();
        },
      });
    } else {
      const q = assist.query.toLowerCase();
      let exact = false;
      for (let i = 0; i < tags.length; i++) {
        const t = tags[i];
        if (q && t.toLowerCase().indexOf(q) < 0) continue;
        if (t.toLowerCase() === q) exact = true;
        const name = t;
        items.push({
          key: "t" + name,
          label: "#" + name,
          hint: tagCounts[name] ? String(tagCounts[name]) : "",
          run: function () {
            applyToken("#" + name);
          },
        });
      }
      if (assist.query && !exact) {
        const fresh = assist.query;
        items.push({
          key: "tnew",
          label: "新建 #" + fresh,
          hint: "新标签",
          run: function () {
            applyToken("#" + fresh);
          },
        });
      }
    }
  }

  async function attachShots(files: File[]) {
    if (!files.length) return;
    setShotBusy(true);
    try {
      const next: { data: string; w: number; h: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const shot = await shrinkImage(files[i]);
        if (shot) next.push(shot);
      }
      if (next.length) setShots(function (list) { return list.concat(next).slice(0, 8); });
    } finally {
      setShotBusy(false);
    }
  }

  async function submit() {
    if (!canAdd || busy) return;
    setBusy(true);
    try {
      const willLand = parseQuickAdd(raw, today);
      const landsInBucket = !willLand.due && !willLand.starts && willLand.tags.length === 0;
      const thrown = raw;
      const id = await actions.add(raw);
      if (id && landsInBucket) throwIntoBucket(thrown, 8);
      if (id && shots.length) {
        for (let i = 0; i < shots.length; i++) {
          await actions.addImage(id, shots[i].data, shots[i].w, shots[i].h);
        }
        setShots([]);
      }
      setRaw("");
      setAssist(null);
      setHelp(false);
    } finally {
      setBusy(false);
    }
  }

  const kindHint: Record<Kind, string> = {
    due: "截止日期 · 今天 / 周五 / 本周末 / 9-20",
    tag: "标签 · 选一个，或直接新建",
    prio: "优先级 · !1 最高",
  };

  const sessionTasks: typeof tasks = [];
  for (let si = 0; si < session.length; si++) {
    for (let ti = 0; ti < tasks.length; ti++) {
      if (tasks[ti].id === session[si]) sessionTasks.push(tasks[ti]);
    }
  }
  const focused = sessionTasks[cursor];

  // triage rhythm: once a row is classified, move the cursor on to the next one still in the bucket
  function advanceFrom(idx: number) {
    // only ever move FORWARD: if nothing is left below, stay put. Wrapping to the top made the
    // selection appear to "run back to the first one" after classifying the last task.
    for (let k = idx + 1; k < sessionTasks.length; k++) {
      if (inView(sessionTasks[k], "inbox", today)) {
        setCursor(k);
        return;
      }
    }
  }
  let sessionLeft = 0;
  for (let sj = 0; sj < sessionTasks.length; sj++) if (inView(sessionTasks[sj], "inbox", today)) sessionLeft++;

  return (
    <div className="kd-lift shrink-0" ref={wrapRef}>
      {/* rendered OUTSIDE the card: the card's backdrop-filter would otherwise become the
          containing block for position:fixed and pin this panel to a 94px-tall box */}
      {triage ? (
        <div
          className={"kd-triage-veil" + (closing ? " kd-triage-veil-out" : "")}
          aria-hidden="true"
          onClick={function () {
            closePanel();
          }}
        />
      ) : null}
        {triage ? (
          <div
            ref={panelRef}
            className={"kd-triage" + (closing ? " kd-triage-out" : "") + (mode === "select" ? " kd-triage-select" : "")}
            role="dialog"
            aria-label="临时仓分拣"
            tabIndex={0}
            onKeyDown={function (e) {
              // let the pane's inputs be inputs; Tab hands focus to them, Esc steps back out of them
              const tag = (e.target as HTMLElement).tagName;
              const inInput = tag === "INPUT" || tag === "TEXTAREA";
              if (e.key === "Escape") {
                e.preventDefault();
                if (inInput) {
                  (e.target as HTMLElement).blur();
                  const el = panelRef.current;
                  if (el) el.focus();
                  return;
                }
              } else if (inInput) {
                // inputs stay inputs: arrows move the caret, they never change the selection
                return;
              } else if (e.key === "Tab") {
                e.preventDefault();
                if (notesRef.current) notesRef.current.focus();
                return;
              } else {
                e.preventDefault();
              }
              const live = sessionTasks[cursor];
              if (e.key === "Escape") {
                if (mode === "select") {
                  setMode("browse");
                } else {
                  closePanel();
                }
                return;
              }
              if (mode === "browse") {
                if (e.key === "Enter") {
                  setMode("select");
                  setGroup(0);
                  setItem(0);
                  setNotesDraft(null);
                  return;
                }
                if (e.key === "ArrowDown") setCursor(function (c) { return Math.min(c + 1, sessionTasks.length - 1); });
                else if (e.key === "ArrowUp") setCursor(function (c) { return Math.max(c - 1, 0); });
                return;
              }
              // select mode: ↑↓ between groups, ←→ inside the active group, Enter applies
              if (e.key === "ArrowDown") setGroup(function (g) { return Math.min(g + 1, 2); });
              else if (e.key === "ArrowUp") setGroup(function (g) { return Math.max(g - 1, 0); });
              else if (e.key === "ArrowRight") setItem(function (k) { return k + 1; });
              else if (e.key === "ArrowLeft") setItem(function (k) { return Math.max(k - 1, 0); });
              else if (e.key === "Enter" || e.key === " ") {
                if (!live) return;
                if (group === 1) {
                  void actions.patch(live.id, { priority: (Math.min(item, 3) + 1) as 1 | 2 | 3 | 4 });
                } else if (group === 0) {
                  const days = [0, 1, 3, 7, 30][item];
                  if (days !== undefined) {
                    void actions.patch(live.id, { due: shiftKey(today, days) });
                    advanceFrom(cursor);
                  }
                } else {
                  const tag = tagList[item] || "";
                  if (tag) {
                    void actions.patch(live.id, { tags: live.tags.indexOf(tag) >= 0 ? [] : [tag] });
                    advanceFrom(cursor);
                  }
                }
              }
            }}
          >
            <div className="kd-triage-head">
              <InboxMark size={15} />
              <Micro>临时仓</Micro>
              <Mono size={11} className="text-muted-foreground">{String(sessionLeft) + " / " + String(sessionTasks.length) + " 待处理"}</Mono>
              <span className="kd-triage-progress">
                <span
                  className="kd-triage-progress-fill"
                  style={{ width: (sessionTasks.length === 0 ? 0 : ((sessionTasks.length - sessionLeft) / sessionTasks.length) * 100) + "%" }}
                />
              </span>
              <span className="flex-1" />
              <button
                type="button"
                aria-label="在收集箱中查看"
                className="kd-ghost rounded-md px-1.5 py-0.5 text-muted-foreground"
                style={{ fontSize: "10.5px" }}
                onClick={function () {
                  closePanel();
                  setView("inbox");
                }}
              >
                列表
              </button>
              <button type="button" aria-label="关闭分拣" className="kd-ghost rounded-md p-0.5 text-muted-foreground" onClick={function () { closePanel(); }}>
                <Icon.X size={13} strokeWidth={2} />
              </button>
            </div>
            <div className="kd-triage-body">
              <div className="kd-triage-list" ref={listRef}>
                {sessionTasks.length === 0 ? (
                  <p className="kd-triage-empty">临时仓已清空</p>
                ) : (
                  sessionTasks.map(function (t, i) {
                    const live = inView(t, "inbox", today);
                    const open = i === cursor;
                    return (
                      <div key={t.id} className={"kd-triage-item" + (live ? "" : " kd-triage-done")}>
                        <button
                          type="button"
                          className={"kd-triage-row" + (open ? " kd-triage-on" : "") + (i === cursor ? " kd-triage-cursor" : "")}
                          onClick={function () {
                            setCursor(i);
                            setNotesDraft(null);
                          }}
                        >
                          <span className="kd-triage-title">{t.title}</span>
                          <span className="kd-triage-meta">
                            {t.due ? <span>{t.due}</span> : null}
                            <span>{"P" + String(t.priority)}</span>
                            {t.tags.map(function (tg) {
                              return <span key={tg}>{"#" + tg}</span>;
                            })}
                            {t.notes ? <span title={t.notes}>{"备注"}</span> : null}
                            {t.subtasks.length ? (
                              <span>{String(t.subtasks.filter(function (s) { return s.done; }).length) + "/" + String(t.subtasks.length)}</span>
                            ) : null}
                            {live ? null : <span className="kd-triage-flag">已归类</span>}
                          </span>
                        </button>
                        {open ? (
                          <div className="kd-acc">
                            <div className="kd-triage-group">
                              <Micro>日期</Micro>
                              <div className="kd-triage-grouprow">
                                <span className="kd-seg">
                                  {([["今天", 0], ["明天", 1], ["本周末", 3], ["下周", 7], ["下月", 30]] as [string, number][]).map(function (c, ci) {
                                    return (
                                      <button
                                        key={c[0]}
                                        type="button"
                                        className={"kd-seg-btn" + (t.due === shiftKey(today, c[1]) ? " kd-lit" : "") + (i === cursor && mode === "select" && group === 0 && item === ci ? " kd-act-on" : "")}
                                        onClick={function () {
                                          void actions.patch(t.id, { due: shiftKey(today, c[1]) });
                                        }}
                                      >
                                        {c[0]}
                                      </button>
                                    );
                                  })}
                                </span>
                                <input
                                  type="date"
                                  aria-label="指定日期"
                                  className="kd-triage-date"
                                  value={t.due || ""}
                                  onChange={function (ev) {
                                    const v = ev.currentTarget.value;
                                    if (v) void actions.patch(t.id, { due: v });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="kd-triage-group">
                              <Micro>优先级</Micro>
                              <div className="kd-triage-grouprow">
                                <span className="kd-seg">
                                  {([1, 2, 3, 4] as const).map(function (p, pi) {
                                    return (
                                      <button
                                        key={p}
                                        type="button"
                                        className={"kd-seg-btn" + (t.priority === p ? " kd-lit" : "") + (i === cursor && mode === "select" && group === 1 && item === pi ? " kd-act-on" : "")}
                                        onClick={function () {
                                          void actions.patch(t.id, { priority: p });
                                        }}
                                      >
                                        {"P" + String(p)}
                                      </button>
                                    );
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="kd-triage-group">
                              <Micro>标签</Micro>
                              <div className="kd-triage-grouprow">
                                {tagList.map(function (name, gi) {
                                  const on = t.tags.indexOf(name) >= 0;
                                  return (
                                    <button
                                      key={name}
                                      type="button"
                                      className={
                                        "kd-seg-btn kd-seg-standalone" +
                                        (on ? " kd-lit" : "") +
                                        (i === cursor && mode === "select" && group === 2 && item === gi ? " kd-act-on" : "")
                                      }
                                      onClick={function () {
                                        void actions.patch(t.id, { tags: on ? [] : [name] });
                                      }}
                                    >
                                      {"#" + name}
                                    </button>
                                  );
                                })}
                                <input
                                  className="kd-triage-newtag"
                                  placeholder="新建标签后回车"
                                  onKeyDown={function (ev) {
                                    if (ev.key === "Enter") {
                                      const v = ev.currentTarget.value.trim();
                                      if (v) void actions.patch(t.id, { tags: [v] });
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="kd-triage-side">
                {focused ? (
                  <React.Fragment>
                    <Micro>详情设置</Micro>
                    <div className="kd-triage-side-title">{focused.title}</div>
                    <div className="kd-detail-block">
                      <Micro>备注</Micro>
                      <textarea
                        ref={notesRef}
                        className="kd-detail-notes kd-detail-input"
                        rows={3}
                        placeholder="补充上下文、链接、下一步…"
                        value={notesDraft === null ? focused.notes : notesDraft}
                        onChange={function (ev) {
                          setNotesDraft(ev.currentTarget.value);
                        }}
                        onBlur={function (ev) {
                          void actions.patch(focused.id, { notes: ev.currentTarget.value });
                          setNotesDraft(null);
                        }}
                      />
                    </div>
                    <div className="kd-detail-block">
                      <Micro>子任务 {String(focused.subtasks.filter(function (s) { return s.done; }).length) + " / " + String(focused.subtasks.length)}</Micro>
                      <div className="kd-detail-subs">
                        {focused.subtasks.map(function (s) {
                          return (
                            <button
                              key={s.id}
                              type="button"
                              className={"kd-detail-sub" + (s.done ? " kd-detail-sub-done" : "")}
                              onClick={function () {
                                void actions.patch(focused.id, {
                                  subtasks: focused.subtasks.map(function (x) {
                                    return x.id === s.id ? { id: x.id, title: x.title, done: !x.done } : x;
                                  }),
                                });
                              }}
                            >
                              <span className="kd-detail-box">{s.done ? "✓" : ""}</span>
                              <span>{s.title}</span>
                            </button>
                          );
                        })}
                        <input
                          className="kd-triage-newtag"
                          placeholder="加一条子任务后回车"
                          onKeyDown={function (ev) {
                            if (ev.key === "Enter") {
                              const v = ev.currentTarget.value.trim();
                              if (v) {
                                void actions.patch(focused.id, {
                                  subtasks: focused.subtasks.concat([{ id: "s_" + String(Date.now()), title: v, done: false }]),
                                });
                                ev.currentTarget.value = "";
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="kd-detail-block">
                      <Micro>状态</Micro>
                      <p className="kd-detail-notes">
                        {[focused.due ? "截止 " + focused.due : "未排期", focused.tags.length ? "#" + focused.tags.join(" #") : "未分类", "P" + String(focused.priority)].join(" · ")}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="kd-ghost kd-line rounded-md border px-2 py-1 text-muted-foreground kd-detail-open"
                      style={{ fontSize: "11px" }}
                      onClick={function () {
                        openTask(focused.id);
                      }}
                    >
                      打开完整详情
                    </button>
                  </React.Fragment>
                ) : (
                  <p className="kd-triage-empty">点左侧任一条，或按 Enter 进入设置</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

      <div className={cn("kd-card group relative rounded-2xl border", inboxCount ? "kd-inbox-card" : "", raw ? "border-foreground" : "border-border/[0.78]")}>
        {inboxCount ? (
          <button
            ref={zoneRef}
            type="button"
            className="kd-inboxzone"
            title={"临时仓有 " + String(inboxCount) + " 项待处理 · 点击开始分拣"}
            onClick={function () {
              setCursor(0);
              setSession(
                tasks
                  .filter(function (x) {
                    return inView(x, "inbox", today);
                  })
                  .map(function (x) {
                    return x.id;
                  })
              );
              setTagList(
                (stats.tags || []).map(function (tg) {
                  return (tg as any).tag || (tg as any).name || String(tg);
                })
              );
              setTriage(true);
            }}
          >
            <span className="kd-inboxzone-mark">
              <InboxMark size={40} />
              <span className="kd-inboxzone-badge">{inboxCount > 99 ? "99+" : String(inboxCount)}</span>
            </span>
          </button>
        ) : null}
        <div className="flex items-center gap-3 px-4 pb-3 pt-4">
          <span className="border-border/[0.78] grid size-6 shrink-0 place-items-center rounded-full border text-muted-foreground transition-colors group-focus-within:border-foreground group-focus-within:text-foreground">
            <Icon.Plus size={13} strokeWidth={2.2} />
          </span>
          <input
            ref={props.inputRef}
            value={raw}
            onChange={function (e) {
              const v = e.target.value;
              setRaw(v);
              sync(v, e.target.selectionStart);
            }}
            onKeyUp={function (e) {
              const nav = e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Home" || e.key === "End";
              if (nav) sync(e.currentTarget.value, e.currentTarget.selectionStart);
            }}
            onClick={function (e) {
              sync(e.currentTarget.value, e.currentTarget.selectionStart);
            }}
            onPaste={function (e) {
              const files = imageFilesFrom(e.clipboardData);
              if (files.length) {
                e.preventDefault();
                void attachShots(files);
              }
            }}
            onKeyDown={function (e) {
              if (assist && items.length) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveIndex(1);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveIndex(-1);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  const it = items[indexRef.current];
                  if (it) it.run();
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setAssist(null);
                  return;
                }
              }
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
              if (e.key === "Escape") {
                if (help) {
                  setHelp(false);
                  return;
                }
                setRaw("");
                e.currentTarget.blur();
              }
            }}
            placeholder="写点什么 · !1 #标签 @明天"
            className="min-w-0 flex-1 bg-transparent text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />
          {canAdd ? null : (
            <span className="hidden shrink-0 items-center gap-1.5 md:inline-flex">
              <Kbd>N</Kbd>
              <Micro>聚焦</Micro>
            </span>
          )}
          <Button
            size="sm"
            disabled={busy || !canAdd}
            onClick={function () {
              void submit();
            }}
          >
            加入
          </Button>
        </div>

        {shots.length || shotBusy ? (
          <div className="flex flex-wrap items-center gap-2 px-4 pb-2.5">
            {shots.map(function (p, i) {
              return (
                <span key={i} className="kd-thumb-wrap">
                  <img src={p.data} alt="" className="kd-thumb" />
                  <button
                    type="button"
                    aria-label="移除图片"
                    className="kd-thumb-x"
                    onClick={function () {
                      setShots(function (list) {
                        return list.filter(function (_, k) {
                          return k !== i;
                        });
                      });
                    }}
                  >
                    <Icon.X size={10} strokeWidth={2.4} />
                  </button>
                </span>
              );
            })}
            <span className="kd-drop-hint">{shotBusy ? "正在处理图片…" : "回车创建后自动贴上"}</span>
          </div>
        ) : null}

        <div className="kd-strip rounded-b-2xl">
          <div className="kd-strip-scroll">
          {raw.length === 0 ? (
            <React.Fragment>
              <Micro className="shrink-0">点这里插入</Micro>
              {(["!", "#", "@"] as string[]).map(function (m) {
                const label = m === "!" ? "! 优先级" : m === "#" ? "# 标签" : "@ 日期";
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={function () {
                      insertMarker(m);
                    }}
                    className="kd-ghost border-border/[0.78] shrink-0 rounded-full border px-2 py-0.5 font-mono text-muted-foreground"
                    style={{ fontSize: "10px" }}
                  >
                    {label}
                  </button>
                );
              })}
            </React.Fragment>
          ) : (
            <React.Fragment>
              <span className="inline-flex items-center gap-1.5">
                <PriorityGlyph priority={parsed.priority} />
                <Micro>{PRIORITY_TEXT[parsed.priority]}</Micro>
              </span>
              <span className="bg-border/[0.72] h-3 w-px" />
              {parsed.tags.length ? (
                <span className="inline-flex shrink-0 items-center gap-1.5">
                  {parsed.tags.map(function (tag) {
                    return <TagPill key={tag} tag={tag} />;
                  })}
                </span>
              ) : (
                <Micro>无标签</Micro>
              )}
              <span className="bg-border/[0.72] h-3 w-px" />
              {due ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-foreground" style={{ fontSize: "10.5px" }}>
                    {due.label}
                  </span>
                  {parsed.due ? (
                    <span className="font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
                      {fullDate(parsed.due)}
                    </span>
                  ) : null}
                </span>
              ) : (
                <Micro>未排期</Micro>
              )}
              {parsed.warnings.length ? (
                <span className="border-destructive/[0.32] inline-flex items-center gap-1 rounded-full border px-2 py-0.5">
                  <Icon.TriangleAlert size={10} strokeWidth={2.2} className="text-destructive" />
                  <span className="text-destructive" style={{ fontSize: "10px" }}>
                    {"不认识 " + parsed.warnings.join(" ")}
                  </span>
                </span>
              ) : null}
            </React.Fragment>
          )}
          </div>
          <button
            type="button"
            aria-label="输入语法"
            onClick={function () {
              setHelp(function (v) {
                return !v;
              });
              setAssist(null);
            }}
            className={cn(
              "kd-ghost border-border/[0.78] grid size-5 shrink-0 place-items-center rounded-full border",
              help ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon.HelpCircle size={12} strokeWidth={2} />
          </button>
        </div>

        {assist && items.length ? (
          <div className="kd-pop">
            <div className="kd-sect">{assist.kind === "due" && editEnd === "starts" ? "开始日 · 选一天" : kindHint[assist.kind]}</div>
            <div className={popupShell(assist.kind, wide)}>
            <div className={wide && assist.kind === "due" ? "flex flex-col gap-3" : ""}>
            <div className={wide && assist.kind === "due" ? "kd-list" : "kd-chips"}>
            {items.map(function (it, i) {
              return (
                <button
                  key={it.key}
                  type="button"
                  onMouseDown={function (e) {
                    e.preventDefault();
                  }}
                  onMouseEnter={function () {
                    focusIndex(i);
                  }}
                  onClick={function () {
                    it.run();
                  }}
                  className={cn("kd-cell", i === index ? "kd-cell-on" : "")}
                >
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {it.hint ? (
                    <span className="shrink-0 font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
                      {it.hint}
                    </span>
                  ) : null}
                </button>
              );
            })}
            </div>
            {wide && assist.kind === "due" ? (
              <Micro>{"↑↓ 选择 · 回车确认"}</Micro>
            ) : null}
            </div>
            {assist.kind === "due" ? (
              <React.Fragment>
                <div className={wide ? "bg-border/[0.72] w-px shrink-0" : "bg-border/[0.72] h-px w-full"} />
                <div className="shrink-0" style={wide ? { width: 280 } : undefined}>
                  <MiniCalendar
                    value={editEnd === "starts" ? (parsed.starts ? parseKey(parsed.starts) : undefined) : parsed.due ? parseKey(parsed.due) : undefined}
                    onChange={function (d) {
                      if (d) pickDate(dateKey(d));
                    }}
                  />
                </div>
              </React.Fragment>
            ) : null}
            </div>
          </div>
        ) : null}

        {help ? (
          <div className="kd-pop">
            <div className="kd-sect">输入语法速查</div>
            {MARKERS.map(function (m) {
              return (
                <div key={m.code} className="flex items-start gap-3 px-2 py-1.5">
                  <span
                    className="bg-muted/45 shrink-0 rounded-md px-1.5 py-0.5 font-mono text-foreground"
                    style={{ fontSize: "10.5px" }}
                  >
                    {m.code}
                  </span>
                  <span className="min-w-0 flex-1 text-muted-foreground" style={{ fontSize: "11.5px", lineHeight: "16px" }}>
                    {m.text}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
