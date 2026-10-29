import { z } from "zod";
import { getCharacter } from "@/lib/characters/store";
import { characterReaction } from "@/lib/engine/local";
import { getProvider } from "@/lib/llm";
import { mockCharacterReaction } from "@/lib/mock/simulate";
import { CATEGORIES, STANCES } from "@/lib/types";

export const maxDuration = 60;

const Body = z.object({
  event: z.object({
    text: z.string(),
    category: z.enum(CATEGORIES),
    actors: z.array(z.string()),
    region: z.string(),
    severity: z.number(),
    novelty: z.number(),
  }),
  crowd: z.record(z.enum(STANCES), z.number()).optional(),
  narratives: z.array(z.object({ name: z.string() })).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = getCharacter(id);
  if (!card) return Response.json({ error: "Unknown character" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { event, crowd, narratives = [] } = parsed.data;

  if (process.env.SIM_ENGINE !== "mock" && (await getProvider().healthy())) {
    try {
      const crowdCtx = crowd ? { stance: crowd, narratives: narratives.map((n) => ({ ...n, share: 0, stance: "indifferent" as const, samples: [] })) } : undefined;
      return Response.json(await characterReaction(card, event, crowdCtx, req.signal));
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Re-roll failed" }, { status: 502 });
    }
  }
  return Response.json(mockCharacterReaction(card, event, crowd));
}
