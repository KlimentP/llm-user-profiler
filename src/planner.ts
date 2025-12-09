import fs from "fs/promises";
import path from "path";
import type { Config } from "./config";
import { introspectDatabase, type TableInfo } from "./db";
import { callLLM } from "./llm";

const PLAN_FILE = "analysis_plan.md";

export async function generatePlan(
	config: Config,
	customFilename?: string,
): Promise<string> {
	if (!config.databaseUrl) {
		throw new Error(
			"DATABASE_URL is required for planning phase. Provide during setup or add to .env file.",
		);
	}

	console.log("🔍 Introspecting database schema...");
	const tables = await introspectDatabase(config.databaseUrl);

	console.log(`📊 Found ${tables.length} tables`);

	// Read optional context file
	let contextContent = "";
	if (config.contextPath) {
		try {
			contextContent = await fs.readFile(config.contextPath, "utf-8");
			console.log("📖 Loaded context document");
		} catch {
			console.warn(`⚠️  Could not read context file: ${config.contextPath}`);
		}
	}

	// Build schema description for LLM
	const schemaDescription = formatSchemaForLLM(tables);

	const systemPrompt = `You are a data analyst specialized in user profiling and behavioral analysis.
Your task is to analyze database schemas and create comprehensive SQL-based analysis plans.
If PostHog is available, you also leverage behavioral data from it.`;

	let postHogContext = "";
	if (config.posthogApiKey && config.posthogProjectId) {
		postHogContext = `
## PostHog Data Access
You have access to PostHog data via HogQL.
The main table is 'events' which has columns like 'event', 'timestamp', 'properties' (JSON), 'person_id'.
You can also access 'persons' table.

Please include a section for "PostHog Queries" to extract behavioral insights (e.g., active sessions, specific feature usage, path analysis).
For each PostHog query, use a markdown code block with the language identifier "hogql".
Write ONLY the SQL query string inside the block.

Example:
\`\`\`hogql
select properties.$current_url, count() from events where timestamp > now() - interval 7 day group by 1 order by 2 desc limit 10
\`\`\`
`;
	}

	const userPrompt = `I need to profile users based on their database activity. Here is the database schema:

${schemaDescription}

${contextContent ? `\n## Additional Context:\n${contextContent}\n` : ""}

${postHogContext}

Please create a comprehensive analysis plan that includes:

1. **Analysis Overview**: Brief description of the profiling approach
2. **Data Points to Extract**: List of specific user metrics to analyze (e.g., resource creation frequency, preferences, usage patterns, timing, volume)
3. **SQL Queries**: Provide complete, executable SQL queries to extract the necessary data. Each query should:
   - Be clearly labeled (e.g., "Query 1: User Resource Creation Count")
   - Target user-related tables
   - Aggregate/transform data for profiling insights
   - Be PostgreSQL-compatible
   - Use \`\`\`sql blocks
${postHogContext ? `4. **PostHog Queries**: Provide HogQL queries to extract behavioral data. Use \`\`\`hogql blocks.` : ""}
${postHogContext ? "5" : "4"}. **User Profile Structure**: Define the JSON schema for the final user profiles, including:
   - Hard-coded fields (directly from query results)
   - LLM-evaluated fields (free-form insights)

Format your response as a well-structured markdown document.`;

	console.log("🤖 Generating analysis plan with LLM...");
	const planContent = await callLLM(config, systemPrompt, userPrompt);

	// Ensure output directory exists
	await fs.mkdir(config.outputDir, { recursive: true });

	const filename = customFilename || PLAN_FILE;
	const planPath = path.join(config.outputDir, filename);
	await fs.writeFile(planPath, planContent, "utf-8");

	console.log(`✅ Analysis plan saved to: ${planPath}`);
	return planPath;
}

function formatSchemaForLLM(tables: TableInfo[]): string {
	return tables
		.map((table) => {
			const columns = table.columns
				.map(
					(col) =>
						`  - ${col.columnName} (${col.dataType}, ${col.isNullable === "YES" ? "nullable" : "not null"})`,
				)
				.join("\n");
			return `### Table: ${table.tableName}\n${columns}`;
		})
		.join("\n\n");
}

export async function checkExistingPlan(
	config: Config,
): Promise<string | null> {
	const planPath = path.join(config.outputDir, PLAN_FILE);

	try {
		await fs.access(planPath);
		return planPath;
	} catch {
		return null;
	}
}
