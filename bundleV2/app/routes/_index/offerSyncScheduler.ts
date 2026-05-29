export type ShopOfferSyncTask = () => Promise<void>;

type ShopOfferSyncEntry = {
  running: boolean;
  pending: boolean;
  latestTask: ShopOfferSyncTask | null;
  waiters: Array<() => void>;
};

export function createShopOfferSyncScheduler() {
  const entries = new Map<string, ShopOfferSyncEntry>();

  async function drain(shopName: string, entry: ShopOfferSyncEntry): Promise<void> {
    if (entry.running) {
      return;
    }

    entry.running = true;

    try {
      while (entry.pending) {
        entry.pending = false;
        const task = entry.latestTask;
        if (!task) {
          continue;
        }
        await task();
      }
    } finally {
      entry.running = false;
      if (entry.pending) {
        void drain(shopName, entry);
        return;
      }

      entries.delete(shopName);
      const waiters = entry.waiters.splice(0, entry.waiters.length);
      waiters.forEach((resolve) => resolve());
    }
  }

  return {
    schedule(shopName: string, task: ShopOfferSyncTask): Promise<void> {
      const normalizedShopName = String(shopName || "").trim();
      const entry =
        entries.get(normalizedShopName) ||
        ({
          running: false,
          pending: false,
          latestTask: null,
          waiters: [],
        } satisfies ShopOfferSyncEntry);

      entry.latestTask = task;
      entry.pending = true;
      entries.set(normalizedShopName, entry);

      const completion = new Promise<void>((resolve) => {
        entry.waiters.push(resolve);
      });

      if (!entry.running) {
        void drain(normalizedShopName, entry);
      }

      return completion;
    },
  };
}
