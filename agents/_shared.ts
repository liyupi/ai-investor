export function createLogger(name: string) {
  return {
    log(...args: unknown[]) { console.log(`[${name}][${new Date().toISOString()}]`, ...args); },
    error(...args: unknown[]) { console.error(`[${name}][${new Date().toISOString()}]`, ...args); },
  };
}

export function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function createSSEResponse(
  generator: (signal?: AbortSignal) => AsyncGenerator<string>,
  signal?: AbortSignal,
): Response {
  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      const heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(sseEvent({ type: 'ping', ts: Date.now() }))); }
        catch { /* stream closed */ }
      }, 5_000);
      try {
        for await (const chunk of generator(signal)) {
          if (signal?.aborted) break;
          controller.enqueue(encoder.encode(chunk));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        const error = e as Error;
        if (error.message?.includes('terminated') && signal?.aborted) {
          // graceful abort
        } else if (error.name !== 'AbortError' && !signal?.aborted) {
          controller.enqueue(encoder.encode(sseEvent({ type: 'error_message', content: error.message })));
        }
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
    cancel() { /* client disconnected */ },
  });
  return new Response(readableStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
