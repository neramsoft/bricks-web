// Starts the website (Next.js standalone) with the settings of this install. The image's CMD
// runs this instead of server.js.
//
// Why: Next fixes `images.remotePatterns` (the hosts next/image may fetch media from) when it
// builds, but they depend on API_URL and MEDIA_PUBLIC_URL, which differ between staging,
// production and every other install. So the build's values are ignored: the hosts are worked
// out here, from the environment of the running container, by the function next.config.ts uses
// (media-hosts.ts, copied into the image), and written into a copy of server.js that is then
// started. Nothing else of Next's configuration is touched.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { allowLocalImages, mediaHosts } from "./media-hosts.ts";
import { patchServerSource } from "./server-patch.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

function stop(message) {
  console.error(`website: ${message}`);
  process.exit(1);
}

// Fail at start, not at the first visitor: these two have no usable default in production.
for (const name of ["API_URL", "SITE_URL"]) {
  if (!process.env[name]?.trim()) stop(`${name} is not set (see .env.example)`);
}

const hosts = mediaHosts({
  API_URL: process.env.API_URL?.trim(),
  MEDIA_PUBLIC_URL: process.env.MEDIA_PUBLIC_URL?.trim() || undefined,
});

let patched;
try {
  patched = patchServerSource(readFileSync(path.join(here, "server.js"), "utf8"), {
    remotePatterns: hosts,
    dangerouslyAllowLocalIP: allowLocalImages(hosts),
  });
} catch (error) {
  stop(error.message);
}
console.log(
  `website: next/image may fetch from ${hosts.map((h) => `${h.protocol}://${h.hostname}${h.port ? `:${h.port}` : ""}`).join(", ") || "no host"}`,
);

// Beside server.js, so its relative paths and `require("next")` resolve as they do for the original.
const target = path.join(here, "server.runtime.mjs");
try {
  writeFileSync(target, patched);
} catch (error) {
  stop(`cannot write ${target}: ${error.message}`);
}
await import(pathToFileURL(target).href);
