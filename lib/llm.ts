// One interface for every model call. Providers are picked from env so models can be swapped freely.
import { z } from "zod";

/** Env value with stray BOMs/whitespace removed (they sneak in when values are piped from some shells). */
const env = (key: string): string | undefined => process.env[key]?.replace(/﻿/g, "").trim() || undefined;

export interface CompleteOptions {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** JSON Schema the provider should constrain output to, when it supports that. */
  schema?: object;
  /** "loose" = don't enforce the schema server-side; describe it in the prompt instead. */
  schemaMode?: "strict" | "loose";
  signal?: AbortSignal;
}

export interface LLMProvider {
  name: string;
  model: string;
  complete(opts: CompleteOptions): Promise<string>;
  healthy(): Promise<boolean>;
}

// ---- Ollama (local) ----

const OLLAMA_URL = env("OLLAMA_URL") ?? "http://127.0.0.1:11434";
const OLLAMA_MODEL = env("OLLAMA_MODEL") ?? "qwen3:4b";

export const ollama: LLMProvider = {
  name: "ollama",
  model: OLLAMA_MODEL,
  async complete({ system, prompt, temperature = 0.7, maxTokens = 1200, schema, signal }) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        think: false,
        format: schema ?? "json",
        keep_alive: "30m",
        options: { temperature, num_predict: maxTokens, num_ctx: 4096 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { message?: { content?: string } };
    return body.message?.content ?? "";
  },
  async healthy() {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/tags`, {
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) return false;
      const { models } = (await res.json()) as { models: { name: string }[] };
      return models.some((m) => m.name === OLLAMA_MODEL || m.name.startsWith(OLLAMA_MODEL + ":"));
    } catch {
      return false;
    }
  },
};

// ---- OpenAI-compatible server: local llama-server / LM Studio, or a hosted API (Groq, OpenRouter...) ----

const OPENAI_URL = (env("LLM_BASE_URL") ?? "http://127.0.0.1:8080/v1").replace(/\/$/, "");
const OPENAI_MODEL = env("LLM_MODEL") ?? "local";
const IS_LOCAL = /\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)[:/]/.test(OPENAI_URL);
const authHeaders = (): Record<string, string> => (env("LLM_API_KEY") ? { Authorization: `Bearer ${env("LLM_API_KEY")}` } : {});

function retryAfterMs(res: Response, body: string): number {
  const header = Number(res.headers.get("retry-after"));
  const m = body.match(/try again in (?:(\d+)m)?([\d.]+)(ms|s)/i);
  if (m) return (Number(m[1] ?? 0) * 60 + Number(m[2]) / (m[3] === "ms" ? 1000 : 1)) * 1000;
  return Number.isFinite(header) && header > 0 ? header * 1000 : 5000;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}

function makeOpenAICompat(MODEL: string): LLMProvider {
  const REASONING = /gpt-oss|o\d-|deepseek-r1/i.test(MODEL);
  // Hosted Qwen3 (e.g. on Groq) thinks by default; turn it off. Locally, chat_template_kwargs does that.
  const HOSTED_QWEN3 = !IS_LOCAL && /qwen3/i.test(MODEL);
  // Remembered per model: once a server rejects json_schema, use json_object mode for it.
  let schemaUnsupported = false;

  return {
    name: IS_LOCAL ? "llama.cpp" : "openai-compatible",
    model: MODEL, // local: replaced with the server's real model id by healthy()
    async complete({ system, prompt, temperature = 0.7, maxTokens = 1200, schema, schemaMode = "strict", signal }) {
      const call = (useSchema: boolean) =>
        fetch(`${OPENAI_URL}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          signal,
          body: JSON.stringify({
            model: MODEL,
            temperature,
            // Reasoning models spend tokens thinking before the JSON; keep it short and leave room.
            max_tokens: REASONING ? maxTokens + 400 : maxTokens,
            ...(REASONING && { reasoning_effort: "low" }),
            ...(HOSTED_QWEN3 && { reasoning_effort: "none" }),
            ...(IS_LOCAL && {
              // Qwen3 hybrids: skip the slow reasoning phase.
              chat_template_kwargs: { enable_thinking: false },
              // llama.cpp sampler: discourages small models from looping the same phrase.
              repeat_penalty: 1.12,
            }),
            response_format:
              schema && useSchema
                ? {
                    type: "json_schema",
                    json_schema: { name: "output", strict: IS_LOCAL, schema },
                  }
                : { type: "json_object" },
            messages: [
              { role: "system", content: system },
              {
                role: "user",
                // Without schema enforcement, spell the shape out for the model.
                content:
                  schema && !useSchema
                    ? `${prompt}\n\nReply with a JSON object matching this JSON Schema:\n${JSON.stringify(schema)}`
                    : prompt,
              },
            ],
          }),
        });

      const strict = !schemaUnsupported && schemaMode === "strict";
      let res = await call(strict);
      // Free tiers rate-limit per minute: wait out short limits instead of failing the run.
      for (let i = 0; res.status === 429 && i < 4; i++) {
        const wait = retryAfterMs(res, await res.clone().text());
        if (wait > 25_000) throw new Error("The free AI quota is used up for the moment. Try again in a minute.");
        await sleep(wait + 250, signal);
        res = await call(strict);
      }
      if (res.status === 429) throw new Error("The AI service is busy (rate limit). Try again in a minute.");
      if (res.status === 400 && schema && !schemaUnsupported) {
        const msg = await res.text();
        if (/json_validate_failed/i.test(msg)) throw new RetryableLLMError(`LLM server 400: ${msg.slice(0, 200)}`);
        if (/json_schema|response_format|structured/i.test(msg)) {
          schemaUnsupported = true;
          res = await call(false);
        } else throw new Error(`LLM server 400: ${msg.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(`LLM server ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return body.choices?.[0]?.message?.content ?? "";
    },
    async healthy() {
      // Hosted APIs: a key is enough. A probe would only add latency, and real errors still surface per call.
      if (!IS_LOCAL) return !!env("LLM_API_KEY");
      try {
        const res = await fetch(`${OPENAI_URL}/models`, {
          headers: authHeaders(),
          signal: AbortSignal.timeout(1500),
        });
        if (!res.ok) return false;
        const body = (await res.json().catch(() => ({}))) as {
          data?: { id: string }[];
        };
        const id = body.data?.[0]?.id;
        if (id && MODEL === "local")
          this.model = id
            .split(/[\\/]/)
            .pop()!
            .replace(/\.gguf$/i, "");
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const openaiCompat = makeOpenAICompat(OPENAI_MODEL);
// Optional second model for character posts. Free tiers rate-limit per model, so this doubles capacity.
const CHARACTER_MODEL = env("LLM_MODEL_CHARACTERS");
const characterModel = CHARACTER_MODEL ? makeOpenAICompat(CHARACTER_MODEL) : openaiCompat;

/**
 * LLM_PROVIDER = "llamacpp" (default, any OpenAI-compatible server) | "ollama".
 * role "characters" uses LLM_MODEL_CHARACTERS when set.
 */
export function getProvider(role: "crowd" | "characters" = "crowd"): LLMProvider {
  if (env("LLM_PROVIDER") === "ollama") return ollama;
  return role === "characters" ? characterModel : openaiCompat;
}

// ---- structured output ----

/** The model produced output the server itself rejected; worth another try. */
export class RetryableLLMError extends Error {}

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("No JSON in model output");
  }
}

/** Call the model for JSON, validate with Zod, retry once with the error fed back. */
export async function generateJSON<T extends z.ZodType>(
  schema: T,
  opts: Omit<CompleteOptions, "schema">,
  provider = getProvider(),
): Promise<z.infer<T>> {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
  let prompt = opts.prompt;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    // After a server-side JSON failure, stop enforcing the schema and let Zod validate instead.
    const schemaMode = lastErr instanceof RetryableLLMError ? "loose" : "strict";
    let raw: string;
    try {
      raw = await provider.complete({
        ...opts,
        prompt,
        schema: jsonSchema,
        schemaMode,
      });
    } catch (err) {
      if (err instanceof RetryableLLMError) {
        lastErr = err;
        continue;
      }
      throw err;
    }
    try {
      return schema.parse(extractJSON(raw));
    } catch (err) {
      lastErr = err;
      prompt = `${opts.prompt}

Your previous answer was invalid (${String(err).slice(0, 300)}). Reply with valid JSON only.`;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Model returned invalid JSON");
}
