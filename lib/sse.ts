import type { SimEvent } from "./types";

const encoder = new TextEncoder();

export function encodeSSE(ev: SimEvent): Uint8Array {
  return encoder.encode(`event: ${ev.type}\ndata: ${JSON.stringify(ev.data)}\n\n`);
}

/** Parse an SSE body from fetch() (EventSource can't POST). */
export async function* readSSE(res: Response): AsyncGenerator<SimEvent> {
  if (!res.body) return;
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let type = "message";
      let data = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) type = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (data) yield { type, data: JSON.parse(data) } as SimEvent;
    }
  }
}
