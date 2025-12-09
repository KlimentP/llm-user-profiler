#!/usr/bin/env bun
import { render } from "ink";
import { parseArgs } from "util";
import { MODELS } from "./src/models.js";
import { App } from "./src/ui/App.js";

const USAGE = `
🧑‍💼 LLM User Profiler CLI

Usage:
  bun run cli.tsx

Interactive Setup:
  1. Output Directory - Where to create llm-user-profiler/ folder
  2. OPENROUTER_API_KEY - Optional if in .env at output directory
  3. DATABASE_URL - Optional if in .env at output directory
  4. Context Path - Optional markdown context file

Options:
  --help                    Show this help message

Available Models:
${Object.entries(MODELS)
	.map(([key, value]) => `  ${key.padEnd(20)} -> ${value}`)
	.join("\n")}

Workflow:
  1. Planning:   Introspect DB → Generate analysis_plan.md → User review
  2. Execution:  Parse SQL queries → Execute → Save interim_results.json
  3. Profiling:  Process data → Generate user_profiles.json
`;

function main() {
	const { values } = parseArgs({
		options: {
			help: { type: "boolean" },
		},
		strict: false,
	});

	if (values.help) {
		console.log(USAGE);
		process.exit(0);
	}

	// Render the Ink app - setup is now handled interactively
	render(<App />);
}

main();
