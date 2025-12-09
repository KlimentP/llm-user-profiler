import dotenv from "dotenv";
import path from "path";
import fs from "fs";

export interface Config {
  openRouterApiKey: string;
  model: string;
  databaseUrl?: string;
  posthogApiKey?: string;
  posthogProjectId?: string;
  contextPath?: string;
  outputDir: string;
}

/**
 * Load .env file from a specific directory
 */
export function loadEnvFromPath(basePath: string): void {
  const envPath = path.join(basePath, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

/**
 * Create the output directory structure
 */
export function createOutputDir(baseDir: string): string {
  const outputDir = path.join(baseDir, "llm-user-profiler");
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

export function loadConfig(args: {
  outputBaseDir: string;
  apiKey?: string;
  model?: string;
  databaseUrl?: string;
  posthogApiKey?: string;
  posthogProjectId?: string;
  contextPath?: string;
}): Config {
  // First, try to load .env from the specified base directory
  loadEnvFromPath(args.outputBaseDir);
  
  const openRouterApiKey = args.apiKey || process.env.OPENROUTER_API_KEY;
  const databaseUrl = args.databaseUrl || process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;
  const posthogApiKey = args.posthogApiKey || process.env.POSTHOG_API_KEY;
  const posthogProjectId = args.posthogProjectId || process.env.POSTHOG_PROJECT_ID;
  
  if (!openRouterApiKey) {
    throw new Error(
      `OpenRouter API key is required.\n` +
      `Either provide it during setup or add OPENROUTER_API_KEY to .env file at: ${args.outputBaseDir}`
    );
  }

  const outputDir = createOutputDir(args.outputBaseDir);

  return {
    openRouterApiKey,
    model: args.model || "google/gemini-2.5-flash",
    databaseUrl,
    posthogApiKey,
    posthogProjectId,
    contextPath: args.contextPath,
    outputDir,
  };
}

