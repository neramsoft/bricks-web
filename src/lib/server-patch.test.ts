import { describe, expect, it } from "vitest";
import { patchServerSource, pinModuleUrl } from "./server-patch";

const images = {
  remotePatterns: [{ protocol: "https" as const, hostname: "api.bricks.ba", port: "" }],
  dangerouslyAllowLocalIP: false,
};

describe("patchServerSource", () => {
  it("replaces only the image hosts of nextConfig", () => {
    const source = [
      "process.env.NODE_ENV = 'production'",
      'const nextConfig = {"poweredByHeader":false,"images":{"formats":["image/webp"],"remotePatterns":[{"hostname":"build"}]}}',
      "startServer(nextConfig)",
    ].join("\n");
    const patched = patchServerSource(source, images);
    const line = patched.split("\n")[1] ?? "";
    expect(JSON.parse(line.replace("const nextConfig = ", ""))).toEqual({
      poweredByHeader: false,
      images: {
        formats: ["image/webp"],
        remotePatterns: images.remotePatterns,
        dangerouslyAllowLocalIP: false,
      },
    });
    expect(patched.split("\n")[0]).toBe(source.split("\n")[0]);
    expect(patched.split("\n")[2]).toBe("startServer(nextConfig)");
  });

  it("throws when the configuration line is missing", () => {
    expect(() => patchServerSource("console.log(1)", images)).toThrow(/nextConfig/);
  });
});

describe("pinModuleUrl", () => {
  it("replaces every import.meta.url with the real file URL", () => {
    const source = [
      "const require = module.createRequire(import.meta.url)",
      "const __dirname = fileURLToPath(new URL('.', import.meta.url))",
    ].join("\n");
    const pinned = pinModuleUrl(source, "file:///app/server.js");
    expect(pinned).toBe(
      [
        'const require = module.createRequire("file:///app/server.js")',
        "const __dirname = fileURLToPath(new URL('.', \"file:///app/server.js\"))",
      ].join("\n"),
    );
  });

  it("throws when the module does not use import.meta.url", () => {
    expect(() => pinModuleUrl("console.log(1)", "file:///app/server.js")).toThrow(/import\.meta/);
  });
});
