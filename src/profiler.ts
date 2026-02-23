import fs from "fs/promises";
import path from "path";
import type { Config } from "./config";
import { callLLM } from "./llm";
import { updateRunManifest } from "./artifacts";

const USER_PROFILES_FILE = "user_profiles.json";

interface ProfileConfidence {
	score: number;
	level: "low" | "medium" | "high";
	missingFields: string[];
}

interface ProfileValidation {
	expectedProfileFields: string[];
	profilesValidated: number;
	invalidProfiles: number;
}

export async function generateProfiles(
	config: Config,
	interimResultsPath: string,
	planPath: string,
): Promise<string> {
	console.log(`📄 Reading interim results from: ${interimResultsPath}`);
	const interimContent = await fs.readFile(interimResultsPath, "utf-8");
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
- Optional profile confidence hints if you can estimate certainty

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
	let profilesData: unknown;
	try {
		profilesData = JSON.parse(cleanedJson);
	} catch (error) {
		console.error("❌ Failed to parse LLM output as JSON");
		throw new Error(`Invalid JSON from LLM: ${error}`);
	}

	const profileSchema = extractProfileSchemaFromPlan(planContent);
	const expectedProfileFields = extractExpectedProfileFields(profileSchema);
	const enrichedProfiles = applyProfileValidationAndConfidence(
		profilesData,
		expectedProfileFields,
	);

	const profilesPath = path.join(config.outputDir, USER_PROFILES_FILE);
	await fs.writeFile(
		profilesPath,
		JSON.stringify(enrichedProfiles, null, 2),
		"utf-8",
	);
	await updateRunManifest(config.outputDir, { latestProfilesPath: profilesPath });

	console.log(`✅ User profiles saved to: ${profilesPath}`);
	return profilesPath;
}

export function extractProfileSchemaFromPlan(planContent: string): unknown | null {
	const sectionMatch = planContent.match(
		/#{1,6}\s+.*user profile structure[\s\S]*?(?=\n#{1,6}\s+|$)/i,
	);
	const searchScope = sectionMatch ? sectionMatch[0] : planContent;

	const jsonBlocksInScope = extractJsonCodeBlocks(searchScope);
	const jsonBlocksFallback =
		jsonBlocksInScope.length > 0 ? jsonBlocksInScope : extractJsonCodeBlocks(planContent);

	for (const block of jsonBlocksFallback) {
		try {
			const parsed = JSON.parse(block);
			if (isRecord(parsed)) {
				return parsed;
			}
		} catch {
			// Ignore malformed JSON snippets and continue scanning.
		}
	}

	return null;
}

export function extractExpectedProfileFields(schema: unknown): string[] {
	if (!isRecord(schema)) {
		return [];
	}

	// Case 1: schema describes wrapper { profiles: [{...}] }
	const wrapperProperties = asRecord(schema.properties);
	const profilesProp = wrapperProperties ? asRecord(wrapperProperties.profiles) : null;
	const profileItems = profilesProp ? asRecord(profilesProp.items) : null;
	const profileItemProperties = profileItems ? asRecord(profileItems.properties) : null;
	if (profileItemProperties) {
		return Object.keys(profileItemProperties);
	}

	// Case 2: schema directly describes a profile object.
	const profileProperties = asRecord(schema.properties);
	if (profileProperties) {
		return Object.keys(profileProperties);
	}

	return [];
}

export function applyProfileValidationAndConfidence(
	rawOutput: unknown,
	expectedProfileFields: string[],
): Record<string, unknown> {
	if (!isRecord(rawOutput)) {
		throw new Error("Profiler output must be a JSON object.");
	}
	const profiles = rawOutput.profiles;
	if (!Array.isArray(profiles)) {
		throw new Error("Profiler output must include a 'profiles' array.");
	}

	let invalidProfiles = 0;
	const normalizedProfiles = profiles.map((profile) => {
		if (!isRecord(profile)) {
			invalidProfiles++;
			return {
				_error: "Profile must be an object.",
				_confidence: {
					score: 0,
					level: "low",
					missingFields: expectedProfileFields,
				} satisfies ProfileConfidence,
			};
		}

		const missingFields = expectedProfileFields.filter((field) => {
			const value = profile[field];
			return (
				value === undefined ||
				value === null ||
				(typeof value === "string" && value.trim() === "") ||
				(Array.isArray(value) && value.length === 0)
			);
		});

		const confidence = buildConfidence(expectedProfileFields, missingFields, profile);
		return {
			...profile,
			_confidence: confidence,
		};
	});

	const metadataInput = isRecord(rawOutput.metadata) ? rawOutput.metadata : {};
	const validation: ProfileValidation = {
		expectedProfileFields,
		profilesValidated: normalizedProfiles.length,
		invalidProfiles,
	};

	return {
		...rawOutput,
		profiles: normalizedProfiles,
		metadata: {
			...metadataInput,
			validation,
		},
	};
}

function buildConfidence(
	expectedProfileFields: string[],
	missingFields: string[],
	profile: Record<string, unknown>,
): ProfileConfidence {
	let score = 0;
	if (expectedProfileFields.length > 0) {
		score = (expectedProfileFields.length - missingFields.length) / expectedProfileFields.length;
	} else {
		const meaningfulKeys = Object.keys(profile).filter(
			(key) => key !== "_confidence" && key !== "_meta",
		);
		const populatedKeys = meaningfulKeys.filter((key) => {
			const value = profile[key];
			return value !== undefined && value !== null && String(value).trim() !== "";
		});
		score = meaningfulKeys.length === 0 ? 0 : populatedKeys.length / meaningfulKeys.length;
	}

	const roundedScore = Number(score.toFixed(2));
	return {
		score: roundedScore,
		level: toConfidenceLevel(roundedScore),
		missingFields,
	};
}

function toConfidenceLevel(score: number): "low" | "medium" | "high" {
	if (score >= 0.8) return "high";
	if (score >= 0.5) return "medium";
	return "low";
}

function extractJsonCodeBlocks(input: string): string[] {
	const blocks: string[] = [];
	const regex = /```json\s*([\s\S]*?)```/gi;
	let match: RegExpExecArray | null;

	// eslint-disable-next-line no-cond-assign
	while ((match = regex.exec(input)) !== null) {
		if (match[1]) {
			blocks.push(match[1].trim());
		}
	}

	return blocks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return isRecord(value) ? value : null;
}
