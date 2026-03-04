import { requireAdmin } from "@/server/auth/session";
import { subscribeAdminEvent } from "@/server/admin/admin-live-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireAdmin();

  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channel = (searchParams.get("channel") ?? "players").trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
        );
      };

      const sendMessage = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      send("connected", "ok");

      const unsubscribe = subscribeAdminEvent(channel, (payload) => {
        send("invalidate", payload ?? "updated");
      });

      const heartbeat = setInterval(() => {
        sendMessage("ping");
      }, 20000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
    cancel() {
      // fermeture gérée par abort
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