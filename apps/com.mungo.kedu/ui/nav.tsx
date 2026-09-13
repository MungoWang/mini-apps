import type { ComponentType } from "react";
import { Icon } from "@monkey-mini-app/ui";

import { InboxMark } from "./atoms";

import type { ViewId } from "../shared/types";

export type ViewDef = {
  id: ViewId;
  label: string;
  key: string;
  icon: ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
};

export const VIEWS: ViewDef[] = [
  { id: "today", label: "今日", key: "1", icon: Icon.Sun },
  { id: "inbox", label: "收集箱", key: "2", icon: InboxMark },
  { id: "upcoming", label: "即将到来", key: "3", icon: Icon.CalendarClock },
  { id: "done", label: "已完成", key: "4", icon: Icon.CheckCircle2 },
  { id: "board", label: "看板", key: "5", icon: Icon.LayoutGrid },
  { id: "stats", label: "统计", key: "6", icon: Icon.BarChart3 },
];

// Two axes, not one list: GROUPS slice the same list by time; MODES change how it is presented.
export const GROUPS = VIEWS.filter(function (v) {
  return v.id !== "board" && v.id !== "stats";
});

export type ModeId = "list" | "board" | "stats";
export const MODES: { id: ModeId; label: string; icon: ViewDef["icon"] }[] = [
  { id: "list", label: "列表", icon: Icon.List },
  { id: "board", label: "看板", icon: Icon.LayoutGrid },
  { id: "stats", label: "统计", icon: Icon.BarChart3 },
];

export const VIEW_META: Record<ViewId, { label: string; desc: string }> = {
  today: { label: "今日", desc: "逾期与今天到期的事" },
  inbox: { label: "收集箱", desc: "未排期、未分类 —— 给它加上日期或标签，它就会离开这里" },
  upcoming: { label: "即将到来", desc: "明天及以后的安排" },
  done: { label: "已完成", desc: "归档与回顾" },
  board: { label: "看板", desc: "按优先级分列，拖动卡片改优先级" },
  stats: { label: "统计", desc: "节奏、连续天数与分布" },
};
