import { rerankAnalogs, searchAnalogs } from "@/lib/analogs/search";
import { getProvider } from "@/lib/llm";
import { parseEventMock } from "@/lib/mock/simulate";
import { SimRequestSchema } from "@/lib/types";

// Debug: which past events an event retrieves. ?rerank=1 adds the LLM re-rank stage (hosted models only).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const parsed = SimRequestSchema.safeParse({ text: params.get("q") ?? "" });
  if (!parsed.success) return Response.json({ error: "Pass ?q=<event text>" }, { status: 400 });
  const event = parseEventMock(parsed.data);
  const candidates = searchAnalogs(event, 20);
  const provider = getProvider("characters");
  const reranked =
    params.get("rerank") === "1" && provider.name !== "llama.cpp" && (await provider.healthy())
      ? await rerankAnalogs(event, candidates, provider, 5, req.signal)
      : undefined;
  return Response.json({ event, keyword: candidates.map(({ id, title, date, similarity }) => ({ id, title, date, similarity })), reranked });
}
