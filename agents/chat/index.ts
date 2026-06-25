import { run, Agent } from '@openai/agents';
import type { Session } from '@openai/agents';
import { createLogger, sseEvent, createSSEResponse } from '../_shared';
import { buildModel } from '../_model';
import { SYSTEM_PROMPT } from './_prompt';

const logger = createLogger('chat');

function toSseEvent(e: any) {
  if (e.type === 'raw_model_stream_event' && e.data?.type === 'output_text_delta') {
    return { event: 'ai_response', data: { content: e.data.delta as string } };
  }
  if (e.type === 'run_item_stream_event' && e.name === 'tool_called') {
    const toolName = e.item?.name ?? e.item?.rawItem?.name;
    if (toolName) return { event: 'tool_call', data: { name: toolName } };
  }
  if (e.type === 'run_item_stream_event' && e.name === 'tool_output') {
    const name = e.item?.name ?? e.item?.rawItem?.name;
    const out = e.item?.output ?? e.item?.rawItem?.output;
    return {
      event: 'tool_result',
      data: {
        name,
        content: typeof out === 'string' ? out.slice(0, 500) : JSON.stringify(out).slice(0, 500),
      },
    };
  }
  if (e.type === 'agent_updated_stream_event') {
    return { event: 'tool_call', data: { name: `handoff:${e.agent?.name}` } };
  }
  return null;
}

export async function onRequest(context: any) {
  const message = (context.request.body ?? {}).message as string | undefined;
  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "'message' is required" }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const signal = context.request.signal as AbortSignal | undefined;
  const env = (context.env ?? {}) as Record<string, string | undefined>;

  let model;
  try {
    model = buildModel(env);
  } catch (e) {
    logger.error('Model init failed:', (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tools = context.tools?.all() ?? [];

  const agent = new Agent({
    name: 'AI投资人',
    instructions: SYSTEM_PROMPT,
    tools,
    model,
  });

  const session: Session | undefined =
    context.store && context.conversation_id
      ? context.store.openaiSession(context.conversation_id)
      : undefined;

  logger.log('New message:', message.slice(0, 100), '| conv:', context.conversation_id);

  return createSSEResponse(
    async function* () {
      try {
        const result = await run(agent, message, {
          stream: true,
          signal,
          session,
          maxTurns: 6,
        });
        for await (const event of result.toStream()) {
          if (signal?.aborted) break;
          const sse = toSseEvent(event);
          if (sse) yield sseEvent({ type: sse.event, ...sse.data });
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError' || signal?.aborted) return;
        if (err.message?.includes('terminated') && signal?.aborted) return;
        logger.error('Stream error:', err.message);
        yield sseEvent({ type: 'error_message', content: err.message });
      }
    },
    signal,
  );
}
