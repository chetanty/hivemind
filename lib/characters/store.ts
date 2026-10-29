// In-memory card store seeded from defaults. Moves to the `characters` table with the database (M4).
import { DEFAULT_CHARACTERS } from "./defaults";
import type { CharacterCard, CharacterReaction } from "../types";

let cards: CharacterCard[] = structuredClone(DEFAULT_CHARACTERS);
const history = new Map<string, { event: string; reaction: CharacterReaction }[]>();

export const listCharacters = () => cards;
export const getCharacter = (id: string) => cards.find((c) => c.id === id);
export function saveCharacters(next: CharacterCard[]) {
  cards = next;
  return cards;
}

/** Keep each character's last 10 reactions so prompts can stay in character across events. */
export function recordReaction(event: string, reaction: CharacterReaction) {
  const list = history.get(reaction.id) ?? [];
  list.unshift({ event, reaction });
  history.set(reaction.id, list.slice(0, 10));
}

export const recentReactions = (id: string, n = 3) => (history.get(id) ?? []).slice(0, n);
