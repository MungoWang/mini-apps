import * as React from "react";
import { StatCard } from "@monkey-mini-app/ui";

import { PRIORITY_LABEL, PRIORITY_TITLE } from "../shared/types";
import { Bar, Micro, Mono, SectionHead, TickBar } from "./atoms";
import { useStore } from "./store";

function Quote(props: { label: string; value: string; tone?: "muted" | "bad" }) {
  return (
    <span className="flex items-baseline gap-2">
      <Micro>{props.label}</Micro>
      <Mono size={13} className={props.tone === "bad" ? "text-destructive" : "text-foreground"}>
        {props.value}
      </Mono>
    </span>
  );
}

export function StatsView() {
  const { stats, tasks } = useStore();
  let max = 1;
  for (let i = 0; i < stats.days.length; i++) if (stats.days[i].count > max) max = stats.days[i].count;

  let daySum = 0;
  for (let i = 0; i < stats.days.length; i++) daySum = daySum + stats.days[i].count;
  const todayLoad = stats.dueToday + stats.doneToday;
  const todayRatio = todayLoad === 0 ? 0 : stats.doneToday / todayLoad;
  let maxPrio = 1;
  for (let i = 0; i < stats.byPriority.length; i++) if (stats.byPriority[i].count > maxPrio) maxPrio = stats.byPriority[i].count;
  let maxTag = 1;
  for (let i = 0; i < stats.tags.length; i++) if (stats.tags[i].count > maxTag) maxTag = stats.tags[i].count;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-8 pr-1">
      <div className="flex flex-col gap-6">
        <div className="kd-statgrid">
          <StatCard title="完成率" value={String(stats.rate) + "%"}>
            <div className="flex flex-col gap-2.5">
              <TickBar ratio={stats.rate / 100} ticks={12} />
              <Micro>{"已完成 " + String(stats.done) + " / 共 " + String(stats.total) + " 项"}</Micro>
            </div>
          </StatCard>
          <StatCard title="进行中" value={stats.active}>
            <div className="flex flex-col gap-2.5">
              <TickBar ratio={stats.total === 0 ? 0 : stats.active / stats.total} ticks={12} />
              <Micro>{stats.overdue ? "其中逾期 " + String(stats.overdue) + " 项" : "暂无逾期"}</Micro>
            </div>
          </StatCard>
          <StatCard title="今日待办" value={stats.dueToday}>
            <div className="flex flex-col gap-2.5">
              <TickBar ratio={todayRatio} ticks={12} />
              <Micro>{"今日已完成 " + String(stats.doneToday) + " 项"}</Micro>
            </div>
          </StatCard>
          <StatCard title="连续完成" value={String(stats.streak) + " 天"}>
            <div className="flex flex-col gap-2.5">
              <TickBar ratio={stats.streak === 0 ? 0 : Math.min(1, stats.streak / 14)} ticks={14} />
              <Micro>{"近 14 天完成 " + String(daySum) + " 项"}</Micro>
            </div>
          </StatCard>
        </div>

        <section className="flex flex-col gap-3">
          <SectionHead title="近 14 天完成" />
          <div className="kd-card border-border/[0.78] rounded-2xl border p-5">
            <div className="flex items-end gap-1.5">
              {stats.days.map(function (d) {
                const h = Math.round((d.count / max) * 100);
                return (
                  <div
                    key={d.key}
                    className="flex flex-1 flex-col items-center gap-2"
                    title={d.key + " · 完成 " + String(d.count) + " 项"}
                  >
                    <span
                      className={
                        (d.count === 0
                          ? "bg-foreground/[0.06]"
                          : d.count === 1
                            ? "bg-foreground/[0.24]"
                            : d.count === 2
                              ? "bg-foreground/[0.45]"
                              : d.count === 3
                                ? "bg-foreground/[0.68]"
                                : "bg-foreground") + " w-full rounded-md transition-colors"
                      }
                      style={{ height: 44 }}
                    />
                    <Mono size={9}>{d.day}</Mono>
                  </div>
                );
              })}
            </div>
            <div className="border-border/[0.78] mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3">
              <Quote label="近 7 天" value={String(stats.weekDone)} />
              <Quote label="今日完成" value={String(stats.doneToday)} />
              <Quote label="逾期" value={String(stats.overdue)} tone={stats.overdue ? "bad" : "muted"} />
              <Quote label="总计" value={String(stats.total)} />
            </div>
          </div>
        </section>

        <div className="kd-2col">
          <section className="flex flex-col gap-3">
            <SectionHead title="优先级分布" count={stats.active} />
            <div className="kd-card border-border/[0.78] flex flex-col gap-3 rounded-2xl border p-5">
              {stats.byPriority.map(function (p) {
                return (
                  <div key={p.priority} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{PRIORITY_LABEL[p.priority]}</span>
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">{PRIORITY_TITLE[p.priority]}</span>
                    <Bar ratio={p.count / maxPrio} className="flex-1" />
                    <Mono size={12} className="w-6 shrink-0 text-right">
                      {String(p.count)}
                    </Mono>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHead title="标签分布" count={stats.tags.length} />
            <div className="kd-card border-border/[0.78] flex flex-col gap-3 rounded-2xl border p-5">
              {stats.tags.length === 0 ? (
                <p className="text-sm text-muted-foreground">还没有标签。在快速添加里用 #标签 标记。</p>
              ) : (
                stats.tags.slice(0, 8).map(function (t) {
                  return (
                    <div key={t.name} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate font-mono text-xs text-muted-foreground">{"#" + t.name}</span>
                      <Bar ratio={t.count / maxTag} className="flex-1" />
                      <Mono size={12} className="w-6 shrink-0 text-right">
                        {String(t.count)}
                      </Mono>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <p className="text-center">
          <Micro>{"共 " + String(tasks.length) + " 条记录 · 存在这台机器上"}</Micro>
        </p>
      </div>
    </div>
  );
}
