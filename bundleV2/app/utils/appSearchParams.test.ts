import { describe, expect, it } from "vitest";

import { buildIndexActionPath } from "./appSearchParams";

describe("buildIndexActionPath", () => {
  it("adds index on empty search", () => {
    expect(buildIndexActionPath("")).toBe("/?index=");
    expect(buildIndexActionPath("?")).toBe("/?index=");
  });

  it("keeps shop/host and strips stale index/_routes", () => {
    expect(
      buildIndexActionPath(
        "?shop=a.myshopify.com&host=abc&index=1&_routes=root",
      ),
    ).toBe("/?shop=a.myshopify.com&host=abc&index=");
  });

  it("accepts URLSearchParams and a custom pathname", () => {
    const params = new URLSearchParams("shop=a.myshopify.com");
    expect(buildIndexActionPath(params, "/")).toBe(
      "/?shop=a.myshopify.com&index=",
    );
  });
});
