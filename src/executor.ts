import fs from "fs/promises";
import path from "path";
import type { Config } from "./config";
import { executeQuery } from "./db";

import { executePostHogQuery } from "./posthog";
import { readRunManifest, updateRunManifest } from "./artifacts";

const INTERIM_RESULTS_FILE = "interim_results.json";
const INTERIM_RESULTS_DIR = "interim_results";
const INTERIM_RESULTS_TIMESTAMPED_FILE =
	/^interim_results_\d{4}-\d{2}-\d{2}T.*\.json$/;

export type ExecutionMode = "full" | "incremental";

interface QueryResult {
	label: string;
	type: "sql" | "hogql";
	query: string;
	data: unknown[];
}

export async function executePlan(
	config: Config,
	planPath: string,
	options?: {
		mode?: ExecutionMode;
	},
): Promise<string> {
	const requestedMode = options?.mode || "full";
	const { effectiveMode, sinceLastRun, untilNow } = await resolveExecutionContext(
		config,
		requestedMode,
	);

	console.log(`📄 Reading plan from: ${planPath}`);
	const planContent = await fs.readFile(planPath, "utf-8");

	const queries = extractQueriesFromPlan(planContent);
	console.log(`🔎 Found ${queries.length} queries in the plan`);
	if (queries.length === 0) {
		throw new Error(
			"No executable SQL/HogQL queries found in the plan. Ensure queries are under 'SQL Queries' or 'PostHog Queries' sections.",
		);
	}

	const hasSqlQueries = queries.some((query) => query.type === "sql");
	if (hasSqlQueries && !config.databaseUrl) {
		throw new Error(
			"DATABASE_URL is required because the plan includes SQL queries. Provide during setup or add to .env file.",
		);
	}

	const results: QueryResult[] = [];
	let incrementalTemplateUsageCount = 0;

	for (const { label, type, query } of queries) {
		console.log(`\n⚡ Executing [${type.toUpperCase()}]: ${label}`);
		try {
			let data: unknown[] = [];
			const queryToExecute =
				effectiveMode === "incremental"
					? applyIncrementalTemplates(query, sinceLastRun, untilNow)
					: query;
			if (effectiveMode === "incremental" && queryToExecute !== query) {
				incrementalTemplateUsageCount++;
			}
			if (type === "sql") {
				validateReadOnlySqlQuery(queryToExecute);
				data = await executeQuery(config.databaseUrl as string, queryToExecute);
			} else if (type === "hogql") {
				data = await executePostHogQuery(config, queryToExecute);
			}

			console.log(`  ✅ Retrieved ${data.length} rows`);
			results.push({ label, type, query: queryToExecute, data });
		} catch (error) {
			console.error(`  ❌ Failed to execute query: ${error}`);
			// We might not want to stop everything if one query fails?
			// User profiler typically wants all data. Throwing is probably safer for now.
			throw error;
		}
	}

	// Create interim_results subdirectory
	const interimDir = path.join(config.outputDir, INTERIM_RESULTS_DIR);
	await fs.mkdir(interimDir, { recursive: true });

	// Create timestamped filename
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const resultsFilename = `interim_results_${timestamp}.json`;
	const resultsPath = path.join(interimDir, resultsFilename);

	await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), "utf-8");
	await updateRunManifest(config.outputDir, {
		latestInterimResultsPath: resultsPath,
		lastExecutionCompletedAt: untilNow,
		lastExecutionMode: effectiveMode,
	});
	if (effectiveMode === "incremental" && incrementalTemplateUsageCount === 0) {
		console.warn(
			"⚠️ Incremental mode was selected, but no '{{since_last_run}}'/'{{until_now}}' placeholders were found. Queries ran without incremental filters.",
		);
	}

	console.log(`\n✅ Interim results saved to: ${resultsPath}`);
	return resultsPath;
}

export function extractQueriesFromPlan(
	planContent: string,
): Array<{ label: string; type: "sql" | "hogql"; query: string }> {
	const sqlSections = extractSectionsByHeading(planContent, /sql\s+queries?/i);
	const hogqlSections = extractSectionsByHeading(
		planContent,
		/(posthog|hogql)\s+queries?/i,
	);
	const hasExplicitSections = sqlSections.length > 0 || hogqlSections.length > 0;
	const queries: Array<{ label: string; type: "sql" | "hogql"; query: string }> =
		[];
	let queryIndex = 1;

	if (hasExplicitSections) {
		for (const section of sqlSections) {
			queryIndex = collectQueryBlocksFromSection(
				queries,
				section,
				"sql",
				queryIndex,
			);
		}
		for (const section of hogqlSections) {
			queryIndex = collectQueryBlocksFromSection(
				queries,
				section,
				"hogql",
				queryIndex,
			);
		}
		return queries;
	}

	for (const section of splitMarkdownSections(planContent)) {
		if (/(example|sample|template)/i.test(section.title)) {
			continue;
		}
		queryIndex = collectQueryBlocksFromSection(
			queries,
			section.content,
			"sql",
			queryIndex,
		);
		queryIndex = collectQueryBlocksFromSection(
			queries,
			section.content,
			"hogql",
			queryIndex,
		);
	}

	return queries;
}

export async function checkInterimResults(
	config: Config,
): Promise<string | null> {
	const manifest = await readRunManifest(config.outputDir);
	if (manifest?.latestInterimResultsPath) {
		try {
			await fs.access(manifest.latestInterimResultsPath);
			return manifest.latestInterimResultsPath;
		} catch {
			// Fall back to directory/file scan if the manifest path no longer exists.
		}
	}

	const interimDir = path.join(config.outputDir, INTERIM_RESULTS_DIR);
	try {
		const filenames = await fs.readdir(interimDir);
		const latestTimestamped = filenames
			.filter((filename) => INTERIM_RESULTS_TIMESTAMPED_FILE.test(filename))
			.sort()
			.at(-1);

		if (latestTimestamped) {
			return path.join(interimDir, latestTimestamped);
		}
	} catch {
		// If the interim directory doesn't exist, fall back to the legacy flat file.
	}

	const resultsPath = path.join(config.outputDir, INTERIM_RESULTS_FILE);

	try {
		await fs.access(resultsPath);
		return resultsPath;
	} catch {
		return null;
	}
}

function splitMarkdownSections(
	content: string,
): Array<{ title: string; content: string }> {
	const headingRegex = /^#{1,6}\s+(.+)$/gm;
	const headings: Array<{ index: number; title: string }> = [];
	let match: RegExpExecArray | null;

	// eslint-disable-next-line no-cond-assign
	while ((match = headingRegex.exec(content)) !== null) {
		headings.push({ index: match.index, title: (match[1] || "").trim() });
	}

	if (headings.length === 0) {
		return [{ title: "", content }];
	}

	const sections: Array<{ title: string; content: string }> = [];
	for (let i = 0; i < headings.length; i++) {
		const current = headings[i];
		if (!current) continue;
		const next = headings[i + 1];
		const sectionStart = current.index;
		const sectionEnd = next ? next.index : content.length;
		sections.push({
			title: current.title,
			content: content.slice(sectionStart, sectionEnd),
		});
	}

	return sections;
}

function extractSectionsByHeading(content: string, titleMatcher: RegExp): string[] {
	const headingRegex = /^(#{1,6})\s+(.+)$/gm;
	const headings: Array<{
		index: number;
		level: number;
		title: string;
		contentStart: number;
	}> = [];
	let match: RegExpExecArray | null;

	// eslint-disable-next-line no-cond-assign
	while ((match = headingRegex.exec(content)) !== null) {
		let contentStart = match.index + match[0].length;
		if (content[contentStart] === "\r" && content[contentStart + 1] === "\n") {
			contentStart += 2;
		} else if (content[contentStart] === "\n") {
			contentStart += 1;
		}

		headings.push({
			index: match.index,
			level: match[1]?.length || 1,
			title: (match[2] || "").trim(),
			contentStart,
		});
	}

	const sections: string[] = [];
	for (let i = 0; i < headings.length; i++) {
		const heading = headings[i];
		if (!heading || !titleMatcher.test(heading.title)) {
			continue;
		}

		let endIndex = content.length;
		for (let j = i + 1; j < headings.length; j++) {
			const next = headings[j];
			if (next && next.level <= heading.level) {
				endIndex = next.index;
				break;
			}
		}

		sections.push(content.slice(heading.contentStart, endIndex));
	}

	return sections;
}

function collectQueryBlocksFromSection(
	output: Array<{ label: string; type: "sql" | "hogql"; query: string }>,
	sectionContent: string,
	targetType: "sql" | "hogql",
	startingQueryIndex: number,
): number {
	const blockRegex = /```(sql|hogql)\s*\n([\s\S]*?)\n```/gi;
	let queryIndex = startingQueryIndex;
	let match: RegExpExecArray | null;

	// eslint-disable-next-line no-cond-assign
	while ((match = blockRegex.exec(sectionContent)) !== null) {
		const type = match[1]?.toLowerCase() as "sql" | "hogql";
		if (type !== targetType) {
			continue;
		}

		const query = match[2]?.trim() || "";
		if (!query) {
			continue;
		}

		output.push({
			label: buildQueryLabel(sectionContent, match.index, queryIndex),
			type,
			query,
		});
		queryIndex++;
	}

	return queryIndex;
}

function buildQueryLabel(
	sectionContent: string,
	blockStartIndex: number,
	queryIndex: number,
): string {
	const contextWindow = sectionContent.slice(
		Math.max(0, blockStartIndex - 280),
		blockStartIndex,
	);
	const contextLines = contextWindow
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const lastLine = contextLines.at(-1);

	if (!lastLine) {
		return `Query ${queryIndex}`;
	}

	const normalized = lastLine
		.replace(/^#{1,6}\s+/, "")
		.replace(/^[-*]\s+/, "")
		.replace(/^\d+\.\s+/, "")
		.replace(/^query\s+\d+:?\s*/i, "")
		.trim();

	if (!normalized) {
		return `Query ${queryIndex}`;
	}

	return normalized.length > 120 ? normalized.slice(0, 117) + "..." : normalized;
}

export function validateReadOnlySqlQuery(query: string): void {
	const normalized = normalizeSqlForSafetyChecks(query);
	if (!normalized) {
		throw new Error("SQL query is empty after normalization.");
	}

	if (normalized.includes(";")) {
		throw new Error(
			"Only a single read-only SQL statement is allowed per sql code block.",
		);
	}

	const firstToken = normalized.match(/^([a-z]+)/i)?.[1]?.toLowerCase();
	if (firstToken !== "select" && firstToken !== "with") {
		throw new Error(
			`Only SELECT/WITH read queries are allowed. Found statement starting with '${firstToken || "unknown"}'.`,
		);
	}

	const forbiddenMutations =
		/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|vacuum|analyze|copy|call|do|merge)\b/i;
	if (forbiddenMutations.test(normalized)) {
		throw new Error(
			"Potentially mutating SQL detected. Plan execution is restricted to read-only queries.",
		);
	}
}

function normalizeSqlForSafetyChecks(query: string): string {
	return query
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/--.*$/gm, " ")
		.replace(/'(?:''|[^'])*'/g, "''")
		.trim()
		.replace(/;+$/g, "")
		.trim();
}

async function resolveExecutionContext(
	config: Config,
	requestedMode: ExecutionMode,
): Promise<{
	effectiveMode: ExecutionMode;
	sinceLastRun: string;
	untilNow: string;
}> {
	const untilNow = new Date().toISOString();
	if (requestedMode === "full") {
		return {
			effectiveMode: "full",
			sinceLastRun: "1970-01-01T00:00:00.000Z",
			untilNow,
		};
	}

	const manifest = await readRunManifest(config.outputDir);
	if (!manifest?.lastExecutionCompletedAt) {
		console.warn(
			"⚠️ Incremental mode requested but no previous execution was found. Falling back to full execution.",
		);
		return {
			effectiveMode: "full",
			sinceLastRun: "1970-01-01T00:00:00.000Z",
			untilNow,
		};
	}

	return {
		effectiveMode: "incremental",
		sinceLastRun: manifest.lastExecutionCompletedAt,
		untilNow,
	};
}

export function applyIncrementalTemplates(
	query: string,
	sinceLastRunIso: string,
	untilNowIso: string,
): string {
	const sinceQuoted = `'${sinceLastRunIso}'`;
	const untilQuoted = `'${untilNowIso}'`;

	return query
		.replaceAll("{{since_last_run}}", sinceQuoted)
		.replaceAll("{{since_last_run_unquoted}}", sinceLastRunIso)
		.replaceAll("{{until_now}}", untilQuoted)
		.replaceAll("{{until_now_unquoted}}", untilNowIso);
}
