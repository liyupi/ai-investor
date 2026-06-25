import OpenAI from 'openai';
import { OpenAIChatCompletionsModel } from '@openai/agents';

const DEFAULT_MODEL = '@makers/deepseek-v4-flash';

export function buildModel(env: Record<string, string | undefined>) {
  const apiKey = env.AI_GATEWAY_API_KEY;
  const baseURL = env.AI_GATEWAY_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error('Missing AI_GATEWAY_API_KEY or AI_GATEWAY_BASE_URL');
  }
  const llmClient = new OpenAI({ apiKey, baseURL });
  return new OpenAIChatCompletionsModel(
    llmClient,
    env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL,
  );
}
