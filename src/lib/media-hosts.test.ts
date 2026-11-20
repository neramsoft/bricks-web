import { describe, expect, it } from "vitest";
import { allowLocalImages, isPrivateHost, mediaHosts } from "./media-hosts";

describe("mediaHosts", () => {
  it("allows the API's host and the media storage's", () => {
    const hosts = mediaHosts({
      API_URL: "http://api:3001",
      MEDIA_PUBLIC_URL: "https://cdn.example.com/probiz-media",
    });
    expect(hosts).toEqual([
      { protocol: "http", hostname: "api", port: "3001" },
      { protocol: "https", hostname: "cdn.example.com", port: "" },
    ]);
  });

  it("adds the development storage when the API is on this machine and no storage is set", () => {
    expect(mediaHosts({ API_URL: "http://localhost:3011" }).map((h) => h.port)).toEqual([
      "3011",
      "9000",
    ]);
    expect(mediaHosts({}).map((h) => h.port)).toEqual(["9000"]);
  });

  it("does not add it for a public API or when a storage is set", () => {
    expect(mediaHosts({ API_URL: "https://api.example.com" })).toHaveLength(1);
    expect(
      mediaHosts({ API_URL: "http://localhost:3001", MEDIA_PUBLIC_URL: "https://cdn.example.com" }),
    ).toHaveLength(2);
  });

  it("ignores an address that is not a URL", () => {
    expect(mediaHosts({ API_URL: "not a url", MEDIA_PUBLIC_URL: "" }).map((h) => h.port)).toEqual([
      "9000",
    ]);
  });
});

describe("allowLocalImages", () => {
  it("is true only when every host is private", () => {
    expect(allowLocalImages(mediaHosts({ API_URL: "http://localhost:3001" }))).toBe(true);
    expect(
      allowLocalImages(
        mediaHosts({
          API_URL: "http://localhost:3001",
          MEDIA_PUBLIC_URL: "https://cdn.example.com",
        }),
      ),
    ).toBe(false);
    expect(allowLocalImages([])).toBe(false);
  });

  it("knows private hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.1.1"]) {
      expect(isPrivateHost(host), host).toBe(true);
    }
    for (const host of ["cdn.example.com", "172.32.0.1", "8.8.8.8"]) {
      expect(isPrivateHost(host), host).toBe(false);
    }
  });
});
