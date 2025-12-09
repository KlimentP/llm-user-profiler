import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import type { Config } from "./config";

export async function callLLM(
  config: Config,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const openrouter = createOpenRouter({
    apiKey: config.openRouterApiKey,
  });

  const { text } = await generateText({
    model: openrouter.chat(config.model),
    system: systemPrompt,
    prompt: userPrompt,
  });

  return text;
}
