import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { siteFixture } from "../test/fixtures/site";

// The SDK is mocked: the proxy's decisions, not the API, are under test.
const sdk = vi.hoisted(() => ({
  getSite: vi.fn(),
  getPaths: vi.fn(),
  getPage: vi.fn(),
  resolveRedirect: vi.fn(),
}));
vi.mock("@probiz/sdk", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@probiz/sdk")>()),
  ...sdk,
}));

import { clearProxyState } from "./lib/proxy-state";
import { proxy } from "./proxy";

const ask = (path: string, method = "GET") =>
  proxy(new NextRequest(`https://bricks.ba${path}`, { method }));

beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubEnv("SITE_URL", "https://bricks.ba");
  clearProxyState();
  Object.values(sdk).forEach((mock) => mock.mockReset());
  sdk.getSite.mockResolvedValue(siteFixture());
  sdk.getPaths.mockResolvedValue([
    { locale: "bs", path: "/", type: "page" },
    { locale: "bs", path: "/meni", type: "page" },
    { locale: "en", path: "/menu", type: "page" },
  ]);
  sdk.resolveRedirect.mockResolvedValue(null);
});

const passed = (response: Response) => response.headers.get("x-middleware-next") === "1";

describe("proxy", () => {
  it("lets a live address through, in either language", async () => {
    expect(passed(await ask("/meni"))).toBe(true);
    expect(passed(await ask("/"))).toBe(true);
    expect(passed(await ask("/en/menu"))).toBe(true);
    expect(sdk.resolveRedirect).not.toHaveBeenCalled();
  });

  it("lets a live address win over a redirect from the same address", async () => {
    sdk.resolveRedirect.mockResolvedValue({ code: 301, location: "/negdje" });
    expect(passed(await ask("/meni"))).toBe(true);
  });

  it("answers a CMS redirect with its status and an absolute address", async () => {
    sdk.resolveRedirect.mockResolvedValue({ code: 301, location: "/meni" });
    const moved = await ask("/stari-meni");
    expect(moved.status).toBe(301);
    expect(moved.headers.get("location")).toBe("https://bricks.ba/meni");
    clearProxyState();
    sdk.resolveRedirect.mockResolvedValue({ code: 302, location: "https://partner.test/a" });
    const temporary = await ask("/privremeno");
    expect(temporary.status).toBe(302);
    expect(temporary.headers.get("location")).toBe("https://partner.test/a");
  });

  it("answers 410 for a gone address, noindex, in the language of the address", async () => {
    sdk.resolveRedirect.mockResolvedValue({ code: 410, location: null });
    const response = await ask("/en/old");
    expect(response.status).toBe(410);
    expect(response.headers.get("x-robots-tag")).toBe("noindex, follow");
    expect(await response.text()).toContain('<html lang="en">');
  });

  it("rewrites an unknown address to /missing and keeps the address", async () => {
    const response = await ask("/nema?a=1");
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://bricks.ba/missing/nema?a=1");
    // The status is the proxy's: the 404 page is an ordinary page whose body is in the first HTML.
    expect(response.status).toBe(404);
  });

  it("treats the default language's own prefix as a missing address", async () => {
    const response = await ask("/bs/meni");
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://bricks.ba/missing/bs/meni");
  });

  it("asks about the address itself when the API has no list of live addresses", async () => {
    const { ProbizApiError } = await import("@probiz/sdk");
    sdk.getPaths.mockRejectedValue(new Error("no such endpoint"));
    sdk.getPage.mockImplementation(async (_client, options: { path: string }) => {
      if (options.path === "/meni") return {};
      throw new ProbizApiError({ status: 404, code: "NOT_FOUND", message: "no" });
    });
    expect(passed(await ask("/meni"))).toBe(true);
    clearProxyState();
    sdk.getPaths.mockRejectedValue(new Error("no such endpoint"));
    expect((await ask("/nema")).headers.get("x-middleware-rewrite")).toContain("/missing/nema");
  });

  it("lets the request through unchanged when the API does not answer", async () => {
    sdk.getSite.mockRejectedValue(new Error("down"));
    expect(passed(await ask("/meni"))).toBe(true);
  });

  it("does not decide anything for a POST", async () => {
    expect(passed(await ask("/nema", "POST"))).toBe(true);
    expect(sdk.getSite).not.toHaveBeenCalled();
  });

  it("passes the address on to the 404 page in a header", async () => {
    const response = await ask("/meni");
    expect(response.headers.get("x-middleware-request-x-site-path")).toBe("/meni");
  });

  it("answers an address the site never serves with a plain 404 and asks the CMS nothing", async () => {
    for (const path of ["/.well-known/ard.json", "/wp-login.php", "/.env", "/en/x.json"]) {
      const response = await ask(path);
      expect(response.status, path).toBe(404);
      expect(response.headers.get("content-type"), path).toContain("text/plain");
      expect(response.headers.get("x-middleware-rewrite"), path).toBeNull();
      expect(response.headers.get("cache-control"), path).toContain("s-maxage=");
      expect(await response.text(), path).not.toContain("<");
    }
    expect(sdk.getSite).not.toHaveBeenCalled();
    expect(sdk.getPaths).not.toHaveBeenCalled();
    expect(sdk.resolveRedirect).not.toHaveBeenCalled();
  });

  it("lets robots.txt, sitemap.xml and llms.txt through without asking the CMS", async () => {
    for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt"]) {
      expect(passed(await ask(path)), path).toBe(true);
    }
    expect(sdk.getSite).not.toHaveBeenCalled();
  });

  it("answers a HEAD for a bot address too, and leaves a POST alone", async () => {
    expect((await ask("/x.php", "HEAD")).status).toBe(404);
    expect(passed(await ask("/x.php", "POST"))).toBe(true);
  });

  it("does not wait for the API when the cached languages or addresses ran out", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      expect(passed(await ask("/meni"))).toBe(true);
      expect(sdk.getSite).toHaveBeenCalledTimes(1);
      expect(sdk.getPaths).toHaveBeenCalledTimes(1);
      // Past both lifetimes, and the API now hangs: the visitor still gets an answer at once.
      vi.setSystemTime(Date.now() + 6 * 60_000);
      sdk.getSite.mockReturnValue(new Promise(() => {}));
      sdk.getPaths.mockReturnValue(new Promise(() => {}));
      expect(passed(await ask("/en/menu"))).toBe(true);
      expect((await ask("/nema")).headers.get("x-middleware-rewrite")).toContain("/missing/nema");
      // The refresh was started in the background, once for each.
      expect(sdk.getSite).toHaveBeenCalledTimes(2);
      expect(sdk.getPaths).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
