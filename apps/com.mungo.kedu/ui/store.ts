import { createContext, useContext } from "react";

import type { Stats } from "../shared/model";
import type { Priority, SortId, Task, ViewId } from "../shared/types";

export type Actions = {
  add: (raw: string) => Promise<string | null>;
  toggle: (id: string) => Promise<void>;
  patch: (id: string, patch: Record<string, unknown>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  undoRemove: () => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  bulk: (ids: string[], action: "done" | "active" | "remove") => Promise<void>;
  clearDone: () => Promise<void>;
  addImage: (taskId: string, data: string, w: number, h: number) => Promise<void>;
  removeImage: (taskId: string, id: string) => Promise<void>;
  loadImages: (ids: string[]) => Promise<Record<string, string>>;
  reset: () => Promise<void>;
};

export type Store = {
  tasks: Task[];
  tags: string[];
  stats: Stats;
  today: string;
  view: ViewId;
  setView: (v: ViewId) => void;
  sort: SortId;
  setSort: (s: SortId) => void;
  query: string;
  setQuery: (q: string) => void;
  tagFilter: string | null;
  setTagFilter: (t: string | null) => void;
  hoverTag: string | null;
  setHoverTag: (t: string | null) => void;
  hoverPrio: Priority | null;
  setHoverPrio: (p: Priority | null) => void;
  prioFilter: Priority[];
  setPrioFilter: (p: Priority[]) => void;
  selectedId: string | null;
  openTask: (id: string | null) => void;
  selectMode: boolean;
  setSelectMode: (v: boolean) => void;
  chosen: string[];
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  expandSubs: boolean;
  graceIds: string[];
  assistOpen: boolean;
  setAssistOpen: (v: boolean) => void;
  actions: Actions;
};

export const StoreCtx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreCtx);
  if (!s) throw new Error("StoreCtx 没有挂载");
  return s;
}
