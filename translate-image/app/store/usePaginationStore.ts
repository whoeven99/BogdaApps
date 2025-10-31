// stores/usePaginationStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PaginationState {
  pageCursorMap: Record<number, { startCursor: string | null; endCursor: string | null }>;
  setPageCursor: (
    page: number,
    cursors: { startCursor: string | null; endCursor: string | null },
  ) => void;
  clearCursors: () => void;
}

export const usePaginationStore = create<PaginationState>()(
  persist(
    (set) => ({
      pageCursorMap: {},
      setPageCursor: (page, cursors) =>
        set((state) => ({
          pageCursorMap: { ...state.pageCursorMap, [page]: cursors },
        })),
      clearCursors: () => set({ pageCursorMap: {} }),
    }),
    {
      name: "pagination-cursor-store", // 存到 localStorage
    },
  ),
);
