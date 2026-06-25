export async function onRequest(context: any) {
  const conversationId = context.request?.body?.conversation_id as string | undefined;
  if (!conversationId) {
    return new Response(JSON.stringify({ error: 'Missing conversation_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const ret = context.utils.abortActiveRun(conversationId);
  return new Response(JSON.stringify({
    status: ret?.aborted ? 'aborting' : 'idle',
    conversation_id: conversationId,
    ...ret,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  });
}
