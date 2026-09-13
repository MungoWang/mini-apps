import * as React from "react";
import { cn } from "@monkey-mini-app/ui";

import { inView } from "../shared/model";
import type { ViewId } from "../shared/types";
import { Mono } from "./atoms";
import { GROUPS, MODES } from "./nav";
import type { ModeId } from "./nav";
import { useStore } from "./store";

// Row 1 = navigation: time groupings as an underline tab bar, presentation mode as an icon
// switcher on the far right. They are different axes, so they get different controls.
// Row 2 = the tag filter, deliberately quieter than navigation.
export function NavBar() {
  const { tasks, today, view, setView, stats } = useStore();
  const [lastGroup, setLastGroup] = React.useState<ViewId>("today");

  const mode: ModeId = view === "board" ? "board" : view === "stats" ? "stats" : "list";
  const activeGroup: ViewId = mode === "list" ? view : lastGroup;

  function pickGroup(id: ViewId) {
    setLastGroup(id);
    setView(id);
  }

  function pickMode(id: ModeId) {
    setView(id === "list" ? lastGroup : id);
  }

  const counts = React.useMemo(
    function () {
      const map: Record<string, number> = {};
      for (let i = 0; i < GROUPS.length; i++) {
        const id = GROUPS[i].id;
        let n = 0;
        for (let j = 0; j < tasks.length; j++) if (inView(tasks[j], id, today)) n = n + 1;
        map[id] = n;
      }
      return map;
    },
    [tasks, today]
  );

  return (
    <div className="flex flex-col">
      <div className="border-b border-border/[0.78] flex flex-wrap items-end gap-x-1 px-4 pt-3">
        {GROUPS.map(function (v) {
          const active = activeGroup === v.id;
          const IconCmp = v.icon;
          return (
            <button
              key={v.id}
              type="button"
              onClick={function () {
                pickGroup(v.id);
              }}
              className={cn(
                "kd-ghost relative flex items-center gap-1.5 rounded-t-md px-2.5 pb-2 pt-1.5 text-xs transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="kd-tabicon inline-flex">
                <IconCmp size={13} strokeWidth={1.9} />
              </span>
              <span className="truncate">{v.label}</span>
              {counts[v.id] ? (
                <Mono size={10} className="text-muted-foreground">
                  {String(counts[v.id])}
                </Mono>
              ) : null}
              {active ? <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-foreground" /> : null}
            </button>
          );
        })}

        <span className="ml-auto flex items-center gap-0.5 pb-1.5">
          {MODES.map(function (m) {
            const on = mode === m.id;
            const IconCmp = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                title={m.label}
                aria-label={m.label}
                aria-pressed={on}
                onClick={function () {
                  pickMode(m.id);
                }}
                className={cn(
                  "kd-ghost grid size-7 place-items-center rounded-md transition-colors",
                  on ? "bg-muted/[0.72] text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <IconCmp size={14} strokeWidth={1.9} />
              </button>
            );
          })}
        </span>
      </div>

    </div>
  );
}
