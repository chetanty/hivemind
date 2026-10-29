import { clientKey, rateLimit } from "@/lib/rateLimit";
import { encodeSSE } from "@/lib/sse";
import { listCharacters } from "@/lib/characters/store";
import { simulate } from "@/lib/engine";
import { SimRequestSchema } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full run is ~9 model calls; give slow providers room (Vercel caps by plan).
export const maxDuration = 120;

export async function POST(req: Request) {
  const limit = rateLimit(`sim:${clientKey(req)}`, 10, 60_000);
  if (!limit.ok) {
    return Response.json({ error: "Too many simulations, slow down." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  const parsed = SimRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Bad request" }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const ev of simulate(parsed.data, { signal: req.signal, characters: listCharacters() })) {
          controller.enqueue(encodeSSE(ev));
        }
      } catch (err) {
        if (!req.signal.aborted) {
          controller.enqueue(encodeSSE({ type: "error", data: { message: err instanceof Error ? err.message : "Simulation failed" } }));
        }
      } finally {
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
