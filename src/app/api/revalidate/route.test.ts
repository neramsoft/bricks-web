import { signRequestBody } from "@probiz/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventFixture } from "../../../../test/fixtures/event";
import { siteFixture } from "../../../../test/fixtures/site";

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag, revalidatePath }));

const SECRET = "whsec_test";
let getSiteBody: () => Response;

vi.mock("@/lib/api", async () => {
  const { createProbizClient } = await import("@probiz/sdk");
  const client = createProbizClient({
    baseUrl: "http://api.test",
    fetch: async () => getSiteBody(),
  });
  return { cmsUncached: () => client, cms: () => client };
});

async function post(body: string, signature?: string | null) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = {};
  if (signature) headers["x-probiz-signature"] = signature;
  return POST(new Request("http://site.test/api/revalidate", { method: "POST", body, headers }));
}

beforeEach(() => {
  revalidateTag.mockClear();
  revalidatePath.mockClear();
  getSiteBody = () => Response.json(siteFixture());
  vi.stubEnv("API_URL", "http://api.test");
  vi.stubEnv("SITE_URL", "https://bricks.ba");
  vi.stubEnv("REVALIDATE_SECRET", SECRET);
  vi.resetModules();
});

describe("POST /api/revalidate", () => {
  it("answers 503 when the secret is not set", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    vi.resetModules();
    const response = await post("{}", "t=1,v1=x");
    expect(response.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("answers 401 for a missing or wrong signature and revalidates nothing", async () => {
    const body = JSON.stringify(eventFixture({ type: "page.updated", paths: ["/"] }));
    expect((await post(body)).status).toBe(401);
    const wrong = await signRequestBody("whsec_other", body);
    expect((await post(body, wrong)).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("answers 400 for a signed body that is not an event", async () => {
    const body = JSON.stringify({ hello: "world" });
    const response = await post(body, await signRequestBody(SECRET, body));
    expect(response.status).toBe(400);
  });

  it("answers 503 when the CMS cannot say which languages exist", async () => {
    getSiteBody = () => new Response("down", { status: 500 });
    const body = JSON.stringify(eventFixture({ type: "page.updated", paths: ["/"] }));
    const response = await post(body, await signRequestBody(SECRET, body));
    expect(response.status).toBe(503);
  });

  it("expires the planned tags and rebuilds the planned paths for a good signature", async () => {
    const body = JSON.stringify(
      eventFixture({ type: "page.updated", paths: ["/meni"], locales: ["bs", "en"] }),
    );
    const response = await post(body, await signRequestBody(SECRET, body));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ revalidated: true, type: "page.updated" });
    expect(revalidateTag).toHaveBeenCalledWith("page:en:/meni", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("menus", { expire: 0 });
    expect(revalidatePath).toHaveBeenCalledWith("/meni");
    expect(revalidatePath).toHaveBeenCalledWith("/en/meni");
  });

  it("rebuilds every layout when the settings changed", async () => {
    const body = JSON.stringify(eventFixture({ type: "settings.updated", groups: ["brand"] }));
    await post(body, await signRequestBody(SECRET, body));
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
