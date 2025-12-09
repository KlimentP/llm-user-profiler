import fs from "fs/promises";
import path from "path";
import type { Config } from "./config";
import { executeQuery } from "./db";

import { executePostHogQuery } from "./posthog";

const PLAN_FILE = "analysis_plan.md";
const INTERIM_RESULTS_FILE = "interim_results.json";

interface QueryResult {
	label: string;
	type: "sql" | "hogql";
	query: string;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: any[];
}

export async function executePlan(config: Config): Promise<string> {
	if (!config.databaseUrl) {
		throw new Error(
			"DATABASE_URL is required for execution phase. Provide during setup or add to .env file.",
		);
	}

	const planPath = path.join(config.outputDir, PLAN_FILE);

	console.log(`📄 Reading plan from: ${planPath}`);
	const planContent = await fs.readFile(planPath, "utf-8");

	const queries = extractQueriesFromPlan(planContent);
	console.log(`🔎 Found ${queries.length} queries in the plan`);

	const results: QueryResult[] = [];

	for (const { label, type, query } of queries) {
		console.log(`\n⚡ Executing [${type.toUpperCase()}]: ${label}`);
		try {
			let data: any[] = [];
			if (type === "sql") {
				data = await executeQuery(config.databaseUrl, query);
			} else if (type === "hogql") {
				data = await executePostHogQuery(config, query);
			}

			console.log(`  ✅ Retrieved ${data.length} rows`);
			results.push({ label, type, query, data });
		} catch (error) {
			console.error(`  ❌ Failed to execute query: ${error}`);
			// We might not want to stop everything if one query fails?
			// User profiler typically wants all data. Throwing is probably safer for now.
			throw error;
		}
	}

	const resultsPath = path.join(config.outputDir, INTERIM_RESULTS_FILE);
	await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");

	console.log(`\n✅ Interim results saved to: ${resultsPath}`);
	return resultsPath;
}

function extractQueriesFromPlan(
	planContent: string,
): Array<{ label: string; type: "sql" | "hogql"; query: string }> {
	const queries: Array<{
		label: string;
		type: "sql" | "hogql";
		query: string;
	}> = [];

	// Match code blocks with optional labels before them
	// Generic regex to capture lang and content
	// Group 1: Label (optional)
	// Group 2: Language (sql or hogql)
	// Group 3: Content
	const blockRegex =
		/(?:(?:###?\s+(?:Query\s+\d+:?\s*)?(.+?))\s*\n)?```(sql|hogql)\n([\s\S]+?)\n```/gi;

	let match: RegExpExecArray | null;
	let queryIndex = 1;

	// eslint-disable-next-line no-cond-assign
	while (true) {
		match = blockRegex.exec(planContent);
		if (!match) break;

		const label = match[1]?.trim() || `Query ${queryIndex}`;
		const typeStr = match[2];
		const type = (typeStr ? typeStr.toLowerCase() : "sql") as "sql" | "hogql";
		const query = match[3]?.trim() || "";

		if (query) {
			queries.push({ label, type, query });
			queryIndex++;
		}
	}

	return queries;
}

export async function checkInterimResults(
	config: Config,
): Promise<string | null> {
	const resultsPath = path.join(config.outputDir, INTERIM_RESULTS_FILE);

	try {
		await fs.access(resultsPath);
		return resultsPath;
	} catch {
		return null;
	}
}
