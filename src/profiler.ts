import fs from "fs/promises";
import path from "path";
import type { Config } from "./config";
import { callLLM } from "./llm";

const INTERIM_RESULTS_FILE = "interim_results.json";
const PLAN_FILE = "analysis_plan.md";
const USER_PROFILES_FILE = "user_profiles.json";

export async function generateProfiles(config: Config): Promise<string> {
	const interimPath = path.join(config.outputDir, INTERIM_RESULTS_FILE);
	const planPath = path.join(config.outputDir, PLAN_FILE);

	console.log(`📄 Reading interim results from: ${interimPath}`);
	const interimContent = await fs.readFile(interimPath, "utf-8");
	const interimData = JSON.parse(interimContent);

	console.log(`📄 Reading analysis plan from: ${planPath}`);
	const planContent = await fs.readFile(planPath, "utf-8");

	const systemPrompt = `You are a data analyst specialized in user profiling and behavioral insights.
Your task is to analyze aggregated user data and generate comprehensive user profiles.
You must produce valid JSON output.`;

	const userPrompt = `Based on the following analysis plan and interim query results, generate detailed user profiles.

## Analysis Plan
${planContent}

## Interim Query Results
${JSON.stringify(interimData, null, 2)}

Please generate user profiles following the structure defined in the analysis plan. Each profile should include:
- Hard-coded fields (directly from query results)
- LLM-evaluated fields (insights, behavioral patterns, recommendations)

Output ONLY valid JSON in the following format:
{
  "profiles": [
    {
      "userId": "...",
      // other fields as defined in the plan
    }
  ],
  "metadata": {
    "totalUsers": 0,
    "generatedAt": "${new Date().toISOString()}"
  }
}`;

	console.log("🤖 Generating user profiles with LLM...");
	const profilesText = await callLLM(config, systemPrompt, userPrompt);

	// Try to extract JSON if wrapped in markdown code blocks
	let cleanedJson = profilesText.trim();
	const jsonMatch = cleanedJson.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
	if (jsonMatch && jsonMatch[1]) {
		cleanedJson = jsonMatch[1].trim();
	}

	// Validate JSON
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let profilesData: any;
	try {
		profilesData = JSON.parse(cleanedJson);
	} catch (error) {
		console.error("❌ Failed to parse LLM output as JSON");
		throw new Error(`Invalid JSON from LLM: ${error}`);
	}

	const profilesPath = path.join(config.outputDir, USER_PROFILES_FILE);
	await fs.writeFile(
		profilesPath,
		JSON.stringify(profilesData, null, 2),
		"utf-8",
	);

	console.log(`✅ User profiles saved to: ${profilesPath}`);
	return profilesPath;
}
