import { run, Agent } from '@openai/agents';
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

function resolveConversationId(context: any): string | undefined {
  return context.conversation_id
    || context.request?.headers?.['makers-conversation-id']
    || undefined;
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
  const conversationId = resolveConversationId(context);
  const store = context.store;

  logger.log('Request | conv:', conversationId, '| hasStore:', !!store, '| msg:', message.slice(0, 80));

  const agent = new Agent({
    name: 'AI投资人',
    instructions: SYSTEM_PROMPT,
    tools,
    model,
  });

  let inputItems: any[] = [];

  if (store && conversationId) {
    try {
      const history = await store.getMessages({
        conversationId,
        limit: 50,
        order: 'asc',
      });
      if (history && history.length > 0) {
        inputItems = store.toOpenAIInput(history);
        logger.log('Loaded history:', history.length, 'messages');
      }
    } catch (e) {
      logger.error('Failed to load history:', (e as Error).message);
    }

    try {
      await store.appendMessage({
        conversationId,
        role: 'user',
        content: message.trim(),
      });
    } catch (e) {
      logger.error('Failed to save user message:', (e as Error).message);
    }
  }

  inputItems.push({ role: 'user', content: message.trim() });

  return createSSEResponse(
    async function* () {
      let fullContent = '';
      try {
        const result = await run(agent, inputItems, {
          stream: true,
          signal,
          maxTurns: 6,
        });
        for await (const event of result.toStream()) {
          if (signal?.aborted) break;
          const sse = toSseEvent(event);
          if (sse) {
            if (sse.event === 'ai_response' && sse.data.content) {
              fullContent += sse.data.content;
            }
            yield sseEvent({ type: sse.event, ...sse.data });
          }
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === 'AbortError' || signal?.aborted) return;
        if (err.message?.includes('terminated') && signal?.aborted) return;
        logger.error('Stream error:', err.message);
        yield sseEvent({ type: 'error_message', content: err.message });
      } finally {
        if (store && conversationId && fullContent) {
          try {
            await store.appendMessage({
              conversationId,
              role: 'assistant',
              content: fullContent,
            });
          } catch (e) {
            logger.error('Failed to save assistant message:', (e as Error).message);
          }
        }
      }
    },
    signal,
  );
}
