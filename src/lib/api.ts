const CONV_KEY = 'ai_investor_conversation_id';

export function getOrCreateConversationId(): string {
  if (typeof window === 'undefined') return '';
  const cached = localStorage.getItem(CONV_KEY);
  if (cached) return cached;
  const fresh = crypto.randomUUID();
  localStorage.setItem(CONV_KEY, fresh);
  return fresh;
}

export function rotateConversationId(): string {
  const fresh = crypto.randomUUID();
  if (typeof window !== 'undefined') localStorage.setItem(CONV_KEY, fresh);
  return fresh;
}

export async function sendMessage(
  message: string,
  onChunk: (type: string, data: any) => void,
  signal?: AbortSignal,
) {
  const conversationId = getOrCreateConversationId();

  const resp = await fetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'makers-conversation-id': conversationId,
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'ping') continue;
        onChunk(parsed.type, parsed);
      } catch {
        // skip malformed
      }
    }
  }
}

export async function stopAgent() {
  const conversationId = getOrCreateConversationId();
  return fetch('/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversation_id: conversationId }),
  });
}
