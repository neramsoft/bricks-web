import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config } from "../proxy";
import { isBotPath } from "./bot-paths";

const root = resolve(import.meta.dirname, "../..");

describe("isBotPath", () => {
  it.each([
    "/.well-known/ard.json",
    "/.well-known/llms.txt",
    "/.well-known/",
    "/.env",
    "/.git/config",
    "/wp-login.php",
    "/en/xmlrpc.php",
    "/backup.ZIP",
    "/config.json",
    "/ads.txt",
    "/sitemap_index.xml",
  ])("is true for %s", (path) => {
    expect(isBotPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/en",
    "/galerija",
    "/en/gallery",
    "/robots.txt",
    "/sitemap.xml",
    "/llms.txt",
    "/_next/static/chunks/build.json",
    "/api/health",
    "/brand/mark.svg",
    "/s/abc123",
    "/nema-ove-stranice",
  ])("is false for %s", (path) => {
    expect(isBotPath(path)).toBe(false);
  });

  it("names no file of public/", () => {
    const walk = (dir: string, prefix: string): string[] =>
      readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? walk(`${dir}/${entry.name}`, `${prefix}/${entry.name}`)
          : [`${prefix}/${entry.name}`],
      );
    for (const file of walk("public", "")) expect(isBotPath(file), file).toBe(false);
  });

  it("is kept in step with the proxy's matcher", () => {
    const sees = (url: string) => unstable_doesMiddlewareMatch({ config, url });
    for (const path of [
      "/.well-known/ard.json",
      "/.well-known/",
      "/.env",
      "/wp-login.php",
      "/x/backup.zip",
      "/config.json",
    ]) {
      expect(sees(path), path).toBe(true);
    }
    // Pages are still the first entry's.
    expect(sees("/galerija")).toBe(true);
    // What the proxy must not see: static files, Next's own, the routes outside the catch-all.
    for (const path of ["/brand/mark.svg", "/_next/static/chunks/a.js", "/api/health"]) {
      expect(sees(path), path).toBe(false);
    }
  });
});
