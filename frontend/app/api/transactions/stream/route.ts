import fs from "fs/promises";
import path from "path";

// Server-Sent Events (SSE) endpoint that broadcasts transaction updates.
// It polls the same source as /api/transactions: XAMPP_PHP_URL or a JSON file in htdocs.

const HTDOCS_PATH = process.env.XAMPP_HTDOCS_PATH || "/Applications/XAMPP/htdocs";
const FALLBACK_FILE = process.env.XAMPP_FILE_NAME || "transactions.json";
const PHP_URL = process.env.XAMPP_PHP_URL || null;

// Persist across HMR / module reloads
const globalAny: any = globalThis as any;
type SSEWriter = WritableStreamDefaultWriter<Uint8Array>;
if (!globalAny.__sse_clients) globalAny.__sse_clients = new Map<number, SSEWriter>();
if (!globalAny.__sse_last) globalAny.__sse_last = null;
if (!globalAny.__sse_timer) {
  // start a background poller
  globalAny.__sse_timer = setInterval(async () => {
    try {
      let data: unknown = null;
      if (PHP_URL) {
        try {
          const res = await fetch(PHP_URL, { cache: "no-store" });
          if (res.ok) data = await res.json();
        } catch (_) {
          data = null;
        }
      }
      if (!data) {
        const filePath = path.join(HTDOCS_PATH, FALLBACK_FILE);
        try {
          const raw = await fs.readFile(filePath, "utf-8");
          data = JSON.parse(raw);
        } catch (_) {
          data = null;
        }
      }

      const payload = JSON.stringify(data || null);
      if (payload !== globalAny.__sse_last) {
        globalAny.__sse_last = payload;
        // broadcast to clients
        for (const [, writer] of globalAny.__sse_clients) {
          try {
            writer.write(encode(`data: ${payload}\n\n`));
          } catch (_) {
            // ignore write errors
          }
        }
      }
    } catch (err) {
      // ignore poll errors
    }
  }, 2000);
}

const encoder = new TextEncoder();
function encode(s: string) {
  return encoder.encode(s);
}

export async function GET(req: Request) {
  const id = Date.now() + Math.random();

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // send a comment/heartbeat to keep connection alive
  writer.write(encode(`: connected\n\n`));

  // register client
  globalAny.__sse_clients.set(id, writer);

  // on client disconnect, remove
  try {
  const abortSignal = (req as Request & { signal?: AbortSignal }).signal as AbortSignal | undefined;
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => {
        try {
          writer.close();
        } catch (_) {}
        globalAny.__sse_clients.delete(id);
      });
    }
  } catch (_) {
    // ignore
  }

  // Immediately send last known value if exists
  if (globalAny.__sse_last) {
    try {
      writer.write(encode(`data: ${globalAny.__sse_last}\n\n`));
    } catch (_) {}
  }

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
