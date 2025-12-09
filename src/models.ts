export const MODELS = {
	OPENAI_OSS_120B: "openai/gpt-oss-120b",
	GEMINI_2_5_FLASH: "google/gemini-2.5-flash",
	GPT_51_CHAT: "openai/gpt-5.1-chat",
	KIMIK2_THINKING: "moonshotai/kimi-k2-thinking",
	GLM_46: "z-ai/glm-4.6",
	MINIMAX_M2: "minimax/minimax-m2",
	GROK_4_FAST: "x-ai/grok-4-fast",
	CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4.5",
	GPT_51: "openai/gpt-5.1",
} as const;

export type ModelKey = keyof typeof MODELS;
export type ModelValue = (typeof MODELS)[ModelKey];
