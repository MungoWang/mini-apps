import * as React from "react";
import { motion } from "motion/react";
import { Icon, Kbd, cn } from "@monkey-mini-app/ui";

import type { Schedule } from "../shared/model";
import { overdueTier } from "../shared/model";
import type { Priority } from "../shared/types";
import { PRIORITY_LABEL, PRIORITY_TITLE } from "../shared/types";

export function Micro(props: { children: React.ReactNode; className?: string; size?: number; track?: number }) {
  const size = props.size === undefined ? 10 : props.size;
  const track = props.track === undefined ? 0.16 : props.track;
  return (
    <span
      className={cn("font-mono uppercase text-muted-foreground", props.className)}
      style={{ fontSize: String(size) + "px", letterSpacing: String(track) + "em" }}
    >
      {props.children}
    </span>
  );
}

export function Mono(props: { children: React.ReactNode; className?: string; size?: number }) {
  return (
    <span
      className={cn("font-mono text-xs tabular-nums", props.className)}
      style={props.size === undefined ? undefined : { fontSize: String(props.size) + "px" }}
    >
      {props.children}
    </span>
  );
}

export function Ruler(props: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none block h-2 w-full", props.className)}
      style={{
        backgroundImage: "repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px 9px)",
        maskImage: "linear-gradient(to right, black, transparent)",
        WebkitMaskImage: "linear-gradient(to right, black, transparent)",
      }}
    />
  );
}

// the capture bucket mark: an open tray with an item dropping in. Drawn rather than borrowed,
// so it reads as "things land here" instead of a generic inbox glyph.
export function InboxMark(props: { size?: number; strokeWidth?: number; className?: string }) {
  const s = props.size === undefined ? 16 : props.size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      {/* drawn slightly smaller than the viewBox so the lid has headroom to swing open inside it */}
      <g transform="translate(2.4 3.2) scale(0.8)">
      {/* the thing falling in — animated during a capture */}
      {/* the letter that just arrived */}
      <g className="kd-mark-item">
        <rect x="6.9" y="1.3" width="8.2" height="5.2" rx="1.1" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" />
        <path d="M8.5 3.1h5M8.5 4.8h3.4" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
      </g>
      {/* the envelope body */}
      <rect x="2.4" y="7.2" width="19.2" height="12.8" rx="2.2" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.4 16.4 9.4 11.4M21.6 16.4 14.6 11.4" stroke="currentColor" strokeWidth="1.1" opacity="0.4" strokeLinecap="round" />
      {/* the flap: hinged along the envelope's top edge, folds open and shut */}
      <g className="kd-mark-lid">
        <path d="M2.4 7.2 12 15.6 21.6 7.2Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      </g>
    </svg>
  );
}

export function TickBar(props: { ratio: number; ticks?: number; className?: string; celebrate?: boolean }) {
  const total = props.ticks === undefined ? 20 : props.ticks;
  const rate = props.ratio < 0 ? 0 : props.ratio > 1 ? 1 : props.ratio;
  const filled = Math.round(rate * total);
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < total; i++) {
    cells.push(<span key={i} style={props.celebrate ? { animationDelay: String(i * 45) + "ms" } : undefined} className={cn(props.celebrate ? "kd-tick-cheer" : "", "h-2.5 w-px rounded-full transition-colors duration-500", i < filled ? "bg-foreground" : "bg-foreground/[0.15]")} />);
  }
  return (
    <span className={cn("inline-flex items-end gap-1", props.className)} aria-hidden="true">
      {cells}
    </span>
  );
}

export function Bar(props: { ratio: number; className?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, props.ratio)) * 100);
  return (
    <span className={cn("kd-bar-track block h-0.5 w-full overflow-hidden rounded-full", props.className)}>
      <span className="kd-bar-fill block h-full rounded-full transition-all duration-500" style={{ width: String(pct) + "%" }} />
    </span>
  );
}

const PRIO_TONE: Record<Priority, string> = {
  1: "bg-foreground",
  2: "bg-foreground/[0.60]",
  3: "bg-foreground/[0.35]",
  4: "bg-foreground/[0.20]",
};

const BAR_H = ["h-1.5", "h-2", "h-3"];

export function PriorityGlyph(props: { priority: Priority; className?: string }) {
  const on = props.priority === 4 ? 1 : 4 - props.priority;
  return (
    <span
      className={cn("inline-flex shrink-0 items-end gap-0.5", props.className)}
      title={"优先级 " + PRIORITY_LABEL[props.priority] + " · " + PRIORITY_TITLE[props.priority]}
    >
      {[0, 1, 2].map(function (i) {
        return <span key={i} className={cn("w-0.5 rounded-full transition-colors", BAR_H[i], i < on ? PRIO_TONE[props.priority] : "bg-foreground/[0.12]")} />;
      })}
    </span>
  );
}

export function TaskCheck(props: { done: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={props.done}
      aria-label={props.done ? "标记为未完成" : "标记为完成"}
      onClick={function (e) {
        e.stopPropagation();
        props.onToggle();
      }}
      className={cn(
        "grid size-4 shrink-0 cursor-pointer place-items-center rounded-full border transition-colors duration-200",
        props.done ? "border-foreground bg-foreground text-background" : "border-border/[0.78] hover:border-foreground",
        props.className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7"
          initial={false}
          animate={{ pathLength: props.done ? 1 : 0, opacity: props.done ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        />
      </svg>
    </button>
  );
}

const DUE_TONE: Record<string, string> = {
  overdue: "text-foreground",
  today: "text-foreground",
  soon: "text-muted-foreground",
  later: "text-muted-foreground",
};

export function DueChip(props: { meta: Schedule | null; className?: string; withIcon?: boolean; priority?: Priority }) {
  if (!props.meta) return null;
  const m = props.meta;
  if (m.tone === "overdue") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-mono leading-none tabular-nums",
          overdueTier(m, props.priority) >= 2
            ? "border-destructive bg-destructive text-[var(--destructive-foreground)]"
            : "border-destructive/55 text-destructive",
          props.className
        )}
        style={{ fontSize: "10.5px" }}
      >
        {props.withIcon ? <Icon.CalendarDays size={11} strokeWidth={2} /> : null}
        {m.label}
      </span>
    );
  }
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-1 font-mono tabular-nums", DUE_TONE[m.tone], props.className)}
      style={{ fontSize: "10.5px" }}
    >
      {props.withIcon ? <Icon.CalendarDays size={11} strokeWidth={2} /> : null}
      {m.label}
    </span>
  );
}

export function TagPill(props: {
  tag: string;
  count?: number;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const cls = cn(
    "kd-ghost inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono leading-4",
    props.active ? "border-foreground bg-foreground text-background" : "border-border/[0.78] text-muted-foreground hover:text-foreground",
    props.className
  );
  const body = (
    <React.Fragment>
      {"#" + props.tag}
      {props.count === undefined ? null : <span className="ml-[5px] tabular-nums opacity-[0.45]">{props.count}</span>}
    </React.Fragment>
  );
  const style = { fontSize: "10px" };
  if (!props.onClick) {
    return (
      <span className={cls} style={style}>
        {body}
      </span>
    );
  }
  return (
    <button type="button" className={cls} style={style} onClick={props.onClick}>
      {body}
    </button>
  );
}

// one tick per subtask: the count is readable at a glance, not just the ratio
export function SubtaskTicks(props: { done: number; total: number; className?: string }) {
  if (props.total <= 0) return null;
  if (props.total > 8) {
    const pct = Math.round((props.done / props.total) * 100);
    return (
      <span className={cn("relative inline-block h-[3px] w-10 align-middle", props.className)} aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-current opacity-30" />
        <span className="absolute inset-y-0 left-0 rounded-full bg-current" style={{ width: String(pct) + "%" }} />
      </span>
    );
  }
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < props.total; i++) {
    cells.push(
      <span
        key={i}
        className={cn("w-[3px] rounded-full", i < props.done ? "bg-current" : "bg-current opacity-30")}
        style={{ height: 9 }}
      />
    );
  }
  return (
    <span className={cn("inline-flex items-end gap-[2px]", props.className)} aria-hidden="true">
      {cells}
    </span>
  );
}

export function SubtaskMeter(props: { done: number; total: number; className?: string }) {
  if (props.total <= 0) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5", props.className)}>
      <SubtaskTicks done={props.done} total={props.total} />
      <Mono size={10} className="text-muted-foreground">
        {String(props.done) + "/" + String(props.total)}
      </Mono>
    </span>
  );
}

export function SectionHead(props: { title: string; count?: number; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", props.className)}>
      <Micro className="shrink-0">{props.title}</Micro>
      {props.count === undefined ? null : (
        <Mono size={10} className="text-muted-foreground">
          {String(props.count).padStart(2, "0")}
        </Mono>
      )}
      <span className="bg-border/[0.72] h-px flex-1" />
      {props.right}
    </div>
  );
}

export function Field(props: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", props.className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Micro>{props.label}</Micro>
        {props.hint ? (
          <span className="font-mono text-muted-foreground" style={{ fontSize: "10px" }}>
            {props.hint}
          </span>
        ) : null}
      </div>
      {props.children}
    </div>
  );
}

export function Hint(props: { keys: string[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex gap-1">
        {props.keys.map(function (k) {
          return <Kbd key={k}>{k}</Kbd>;
        })}
      </span>
      <span>{props.label}</span>
    </span>
  );
}
