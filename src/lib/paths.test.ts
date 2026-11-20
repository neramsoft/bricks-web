import { createProbizClient } from "@probiz/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { indexPaths, livePaths, pathKey } from "./paths";
import { clearProxyState } from "./proxy-state";

function api(handler: (url: URL) => Response | Promise<Response>) {
  const calls: string[] = [];
  const client = createProbizClient({
    baseUrl: "http://api.test",
    fetch: async (input) => {
      const url = new URL((input as Request).url);
      calls.push(`${url.pathname}${url.search}`);
      return handler(url);
    },
  });
  return { client, calls };
}

const list = (
  items: Array<{ locale: string; path: string; type: string }>,
  nextCursor: string | null = null,
) => Response.json({ items, nextCursor });

beforeEach(() => clearProxyState());

describe("pathKey", () => {
  it("folds case and the slashes as the API does", () => {
    expect(pathKey("en", "/Blog/Post/")).toBe("en:/blog/post");
    expect(pathKey("bs", "/")).toBe("bs:/");
  });
});

describe("indexPaths", () => {
  it("holds a path per language", () => {
    const set = indexPaths([
      { locale: "bs", path: "/blog", type: "blog" },
      { locale: "en", path: "/blog/a", type: "post" },
    ]);
    expect(set.has("bs:/blog")).toBe(true);
    expect(set.has("en:/blog/a")).toBe(true);
    expect(set.has("bs:/blog/a")).toBe(false);
  });
});

describe("livePaths", () => {
  it("reads every page of the list and remembers it", async () => {
    const { client, calls } = api((url) =>
      url.searchParams.get("cursor")
        ? list([{ locale: "bs", path: "/b", type: "page" }])
        : list([{ locale: "bs", path: "/a", type: "page" }], "page:2"),
    );
    const first = await livePaths(client);
    expect([...(first ?? [])].sort()).toEqual(["bs:/a", "bs:/b"]);
    expect(calls).toHaveLength(2);
    expect(await livePaths(client)).toBe(first);
    expect(calls).toHaveLength(2);
  });

  it("shares one read between requests that come together", async () => {
    const { client, calls } = api(() => list([{ locale: "bs", path: "/a", type: "page" }]));
    await Promise.all([livePaths(client), livePaths(client), livePaths(client)]);
    expect(calls).toHaveLength(1);
  });

  it("is null, and not asked again at once, when the API has no such list or does not answer", async () => {
    const { client, calls } = api(() =>
      Response.json({ statusCode: 404, code: "NOT_FOUND", message: "no" }, { status: 404 }),
    );
    expect(await livePaths(client)).toBeNull();
    expect(await livePaths(client)).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("is read again after a clear (the revalidation webhook)", async () => {
    let n = 0;
    const { client } = api(() => list([{ locale: "bs", path: `/p${++n}`, type: "page" }]));
    expect([...((await livePaths(client)) ?? [])]).toEqual(["bs:/p1"]);
    clearProxyState();
    expect([...((await livePaths(client)) ?? [])]).toEqual(["bs:/p2"]);
  });

  it("does not keep a read that was overtaken by a clear", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    const { client } = api(async () => {
      await gate;
      return list([{ locale: "bs", path: "/old", type: "page" }]);
    });
    const pending = livePaths(client);
    clearProxyState();
    release();
    await pending;
    const { client: fresh } = api(() => list([{ locale: "bs", path: "/new", type: "page" }]));
    expect([...((await livePaths(fresh)) ?? [])]).toEqual(["bs:/new"]);
  });
});

void vi;
