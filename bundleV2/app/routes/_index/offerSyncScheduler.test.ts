import { describe, expect, it } from "vitest";

import { createShopOfferSyncScheduler } from "./offerSyncScheduler";

describe("offerSyncScheduler", () => {
  it("serializes sync tasks per shop and reruns once with the latest pending state", async () => {
    const scheduler = createShopOfferSyncScheduler();
    const events: string[] = [];
    let releaseFirstRun: () => void = () => {};
    const firstRunGate = new Promise<void>((resolve) => {
      releaseFirstRun = resolve;
    });

    const first = scheduler.schedule("shop-a", async () => {
      events.push("first:start");
      await firstRunGate;
      events.push("first:end");
    });

    const second = scheduler.schedule("shop-a", async () => {
      events.push("second:run");
    });

    expect(events).toEqual(["first:start"]);

    releaseFirstRun();
    await Promise.all([first, second]);

    expect(events).toEqual(["first:start", "first:end", "second:run"]);
  });

  it("coalesces multiple pending sync requests into the latest rerun for the same shop", async () => {
    const scheduler = createShopOfferSyncScheduler();
    const events: string[] = [];
    let releaseFirstRun: () => void = () => {};
    const firstRunGate = new Promise<void>((resolve) => {
      releaseFirstRun = resolve;
    });

    const first = scheduler.schedule("shop-a", async () => {
      events.push("first:start");
      await firstRunGate;
      events.push("first:end");
    });

    const second = scheduler.schedule("shop-a", async () => {
      events.push("second:run");
    });

    const third = scheduler.schedule("shop-a", async () => {
      events.push("third:run");
    });

    releaseFirstRun();
    await Promise.all([first, second, third]);

    expect(events).toEqual(["first:start", "first:end", "third:run"]);
  });

  it("allows different shops to run independently", async () => {
    const scheduler = createShopOfferSyncScheduler();
    const events: string[] = [];

    await Promise.all([
      scheduler.schedule("shop-a", async () => {
        events.push("shop-a");
      }),
      scheduler.schedule("shop-b", async () => {
        events.push("shop-b");
      }),
    ]);

    expect(events.sort()).toEqual(["shop-a", "shop-b"]);
  });
});
