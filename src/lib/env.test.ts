import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("uses the development ports outside production", () => {
    expect(parseEnv({}, false)).toEqual({
      API_URL: "http://localhost:3001",
      PUBLIC_API_URL: "http://localhost:3001",
      SITE_URL: "http://localhost:3000",
      TRUSTED_PROXY_HOPS: 0,
    });
  });

  it("requires both addresses in production", () => {
    expect(() => parseEnv({}, true)).toThrow(/API_URL/);
    expect(() => parseEnv({ API_URL: "http://api:3001" }, true)).toThrow(/SITE_URL/);
  });

  it("strips trailing slashes and keeps the optional settings", () => {
    expect(
      parseEnv(
        {
          API_URL: "http://api:3001/",
          SITE_URL: "https://bricks.ba//",
          REVALIDATE_SECRET: " whsec_abc ",
          MEDIA_PUBLIC_URL: "https://media.test/",
          TRUSTED_PROXY_HOPS: "1",
        },
        true,
      ),
    ).toEqual({
      API_URL: "http://api:3001",
      PUBLIC_API_URL: "http://api:3001",
      SITE_URL: "https://bricks.ba",
      REVALIDATE_SECRET: "whsec_abc",
      MEDIA_PUBLIC_URL: "https://media.test",
      TRUSTED_PROXY_HOPS: 1,
    });
  });

  it("takes the browser's API address from PUBLIC_API_URL, else from API_URL", () => {
    const set = parseEnv(
      {
        API_URL: "http://api:3001",
        SITE_URL: "https://bricks.ba",
        PUBLIC_API_URL: "https://api.bricks.ba/",
      },
      true,
    );
    expect(set.API_URL).toBe("http://api:3001");
    expect(set.PUBLIC_API_URL).toBe("https://api.bricks.ba");
    expect(parseEnv({ PUBLIC_API_URL: "" }, false).PUBLIC_API_URL).toBe("http://localhost:3001");
    expect(() => parseEnv({ PUBLIC_API_URL: "ftp://x" }, false)).toThrow(/PUBLIC_API_URL/);
  });

  it("counts an empty value as unset", () => {
    const env = parseEnv(
      { API_URL: "", SITE_URL: " ", REVALIDATE_SECRET: "", TRUSTED_PROXY_HOPS: "" },
      false,
    );
    expect(env.REVALIDATE_SECRET).toBeUndefined();
    expect(env.API_URL).toBe("http://localhost:3001");
    expect(env.TRUSTED_PROXY_HOPS).toBe(0);
  });

  it("accepts 0 to 5 proxy hops and nothing else", () => {
    for (const hops of ["0", "1", "5"]) {
      expect(parseEnv({ TRUSTED_PROXY_HOPS: hops }, false).TRUSTED_PROXY_HOPS).toBe(Number(hops));
    }
    for (const hops of ["6", "-1", "1.5", "two"]) {
      expect(() => parseEnv({ TRUSTED_PROXY_HOPS: hops }, false), hops).toThrow(
        /TRUSTED_PROXY_HOPS/,
      );
    }
  });

  it("refuses an address that is not http(s) and lists every problem", () => {
    expect(() => parseEnv({ API_URL: "ftp://x.test", SITE_URL: "nonsense" }, false)).toThrow(
      /API_URL.*SITE_URL/,
    );
  });
});
