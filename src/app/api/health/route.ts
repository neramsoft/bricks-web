// The container's health check. It answers from this process alone: no CMS call and no settings
// check, so a slow or restarting API never marks the website unhealthy. Reports only the status.
// Never cached, never indexed.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
