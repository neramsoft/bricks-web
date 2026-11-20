// A request body read with a hard limit. `Content-Length` is only what the client says (and a chunked
// body has none), so the bytes are counted as they arrive and the read stops at the limit.

export type LimitedBody = { ok: true; bytes: Uint8Array } | { ok: false; reason: "too_large" };

/** Reads the body up to `max` bytes. Past that it stops reading, drops what it has and says so. */
export async function readBodyLimited(request: Request, max: number): Promise<LimitedBody> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return { ok: false, reason: "too_large" };
  if (!request.body) return { ok: true, bytes: new Uint8Array(0) };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, reason: "too_large" };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

/** The form data of a body read with a limit, or `too_large`; throws when the body is no form. */
export async function formDataLimited(
  request: Request,
  max: number,
): Promise<{ data: FormData } | { reason: "too_large" }> {
  const body = await readBodyLimited(request, max);
  if (!body.ok) return { reason: body.reason };
  const type = request.headers.get("content-type");
  const data = await new Response(body.bytes as BodyInit, {
    headers: type ? { "content-type": type } : {},
  }).formData();
  return { data };
}
