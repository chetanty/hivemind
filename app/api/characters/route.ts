import { z } from "zod";
import { listCharacters, saveCharacters } from "@/lib/characters/store";
import { CharacterCardSchema } from "@/lib/types";

export async function GET() {
  return Response.json({ characters: listCharacters() });
}

export async function PUT(req: Request) {
  const parsed = z.array(CharacterCardSchema).min(1).max(8).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid cards" }, { status: 400 });
  return Response.json({ characters: saveCharacters(parsed.data) });
}
