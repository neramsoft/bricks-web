import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PROXY_HANDLED_PATHS, RESERVED_PATHS } from "./reserved-paths";

const root = resolve(import.meta.dirname, "../..");

describe("reserved paths", () => {
  it("are the top-level routes of src/app that are not the catch-all", () => {
    const folders = readdirSync(resolve(root, "src/app"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      // Dynamic segments and route groups are the catch-all and its kin; _private folders are not
      // routes; "~" folders are internal rewrite targets of the proxy (nobody's address).
      .filter((entry) => !/^[[(_~]/.test(entry.name))
      .map((entry) => entry.name);
    expect(folders.sort()).toEqual([...RESERVED_PATHS].sort());
  });

  it("are all kept out of the proxy by its matcher, except the ones the proxy handles", () => {
    const source = readFileSync(resolve(root, "src/proxy.ts"), "utf8");
    const matcher = /matcher:\s*\[\s*"([^"]+)"/.exec(source)?.[1] ?? "";
    for (const path of RESERVED_PATHS.filter((entry) => !PROXY_HANDLED_PATHS.includes(entry))) {
      expect(matcher, path).toContain(path.replace(".", "\\\\."));
    }
  });

  it("has the proxy handle each address it does not skip", () => {
    const source = readFileSync(resolve(root, "src/proxy.ts"), "utf8");
    for (const path of PROXY_HANDLED_PATHS) expect(source, path).toContain(`"/${path}/"`);
  });
});
