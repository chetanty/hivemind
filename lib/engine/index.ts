import { getProvider } from "../llm";
import { mockSimulate } from "../mock/simulate";
import type { CharacterCard, SimEvent, SimRequest } from "../types";
import { localSimulate } from "./local";

/** Pick the engine: local model when it's reachable, otherwise the template mock (with a notice). */
export async function* simulate(
  req: SimRequest,
  opts: { signal?: AbortSignal; characters: CharacterCard[] },
): AsyncGenerator<SimEvent> {
  const provider = getProvider();
  if (process.env.SIM_ENGINE !== "mock" && (await provider.healthy())) {
    yield* localSimulate(req, opts);
    return;
  }
  yield {
    type: "meta",
    data: {
      engine: "mock",
      notice:
        process.env.SIM_ENGINE === "mock"
          ? "Mock engine forced by SIM_ENGINE=mock."
          : provider.name === "ollama"
            ? `Local model "${provider.model}" isn't running, so this is template data. Start Ollama and run: ollama pull ${provider.model}`
            : provider.name === "llama.cpp"
              ? "The local model server isn't running, so this is template data. Start it with: npm run llm"
              : "The AI service isn't reachable (check LLM_BASE_URL / LLM_API_KEY), so this is template data.",
    },
  };
  yield* mockSimulate(req, opts);
}
