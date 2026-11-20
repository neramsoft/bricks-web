import { beforeEach, describe, expect, it, vi } from "vitest";

let answer: Response;
const requested: string[] = [];

vi.mock("@/lib/api", async () => {
  const { createProbizClient } = await import("@probiz/sdk");
  const client = createProbizClient({
    baseUrl: "http://api.test",
    fetch: async (input) => {
      requested.push(new URL((input as Request).url).pathname);
      return answer.clone();
    },
  });
  return { cms: () => client };
});

beforeEach(() => {
  requested.length = 0;
  vi.resetModules();
});

describe("GET /robots.txt", () => {
  it("serves the CMS's text as plain text", async () => {
    answer = Response.json({
      text: "User-agent: *\nDisallow: /api/\nSitemap: https://bricks.ba/sitemap.xml\n",
    });
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("Sitemap: https://bricks.ba/sitemap.xml");
    expect(requested).toEqual(["/v1/public/robots"]);
  });
});
